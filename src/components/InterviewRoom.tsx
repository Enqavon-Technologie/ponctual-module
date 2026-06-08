import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
    IAgoraRTCClient,
    IAgoraRTCRemoteUser,
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import {
    Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, AlertCircle, Users,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';

interface InterviewRoomProps {
    channel: string;
}

/** Plays a single remote participant's video into its own container. */
const RemotePlayer: React.FC<{ user: IAgoraRTCRemoteUser }> = ({ user }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current && user.videoTrack) {
            user.videoTrack.play(ref.current, { fit: 'cover' });
        }
        return () => { user.videoTrack?.stop(); };
    }, [user, user.videoTrack]);
    return <div ref={ref} className="w-full h-full bg-slate-800" />;
};

/**
 * Full-screen Agora video-interview room. Reached via /interview/:channel — the
 * link shared with the family and the babysitter. No account required; the first
 * person to open the link joins (and thereby creates) the channel, the second
 * person joins the same room. App-ID-only authentication (no token server).
 */
export const InterviewRoom: React.FC<InterviewRoomProps> = ({ channel }) => {
    const { language } = useLanguage();
    const fr = language === 'fr';

    const [phase, setPhase] = useState<'lobby' | 'joining' | 'in-call' | 'left' | 'error'>('lobby');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [name, setName] = useState('');
    const [localName, setLocalName] = useState('');

    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null);
    const localVideoRef = useRef<ICameraVideoTrack | null>(null);
    const localContainerRef = useRef<HTMLDivElement>(null);

    const cleanup = async () => {
        try {
            localAudioRef.current?.close();
            localVideoRef.current?.close();
            localAudioRef.current = null;
            localVideoRef.current = null;
            if (clientRef.current) {
                clientRef.current.removeAllListeners();
                await clientRef.current.leave();
            }
        } catch { /* best-effort */ }
    };

    // Leave the call when the page/tab is closed or the component unmounts.
    useEffect(() => {
        const onUnload = () => { cleanup(); };
        window.addEventListener('beforeunload', onUnload);
        return () => {
            window.removeEventListener('beforeunload', onUnload);
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Render the local camera preview once the in-call view (and its container)
    // is actually mounted — runs after the DOM commit, so the ref is attached.
    useEffect(() => {
        if (phase === 'in-call' && camOn && localVideoRef.current && localContainerRef.current) {
            localVideoRef.current.play(localContainerRef.current, { fit: 'cover' });
        }
    }, [phase, camOn]);

    const join = async () => {
        const displayName = name.trim();
        if (!displayName) return; // a name is required to join
        setLocalName(displayName);
        setPhase('joining');
        try {
            // Fetch a fresh RTC token bound to this participant's name (string
            // account) so the other side sees who joined.
            let cred;
            try {
                cred = await api.getAgoraToken(channel, displayName);
            } catch (tokErr: any) {
                console.error('Token request failed:', tokErr);
                setErrorMsg(fr
                    ? 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.'
                    : 'Could not reach the server. Check your connection and try again.');
                setPhase('error');
                return;
            }
            if (!cred?.status || !cred.token || !cred.appId) {
                setErrorMsg(fr
                    ? 'La visioconférence n’est pas configurée. Réessayez plus tard.'
                    : 'Video calling is not configured. Please try again later.');
                setPhase('error');
                return;
            }

            const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            clientRef.current = client;

            client.on('user-published', async (user, mediaType) => {
                await client.subscribe(user, mediaType);
                if (mediaType === 'audio') {
                    user.audioTrack?.play();
                }
                // Re-render so the (possibly new) user shows up with their video.
                setRemoteUsers(Array.from(client.remoteUsers));
            });
            client.on('user-unpublished', () => {
                setRemoteUsers(Array.from(client.remoteUsers));
            });
            client.on('user-left', () => {
                setRemoteUsers(Array.from(client.remoteUsers));
            });

            // Join under the participant's name (string uid), matching the token.
            await client.join(cred.appId, channel, cred.token, displayName);

            const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
            localAudioRef.current = audioTrack;
            localVideoRef.current = videoTrack;
            await client.publish([audioTrack, videoTrack]);

            // The local preview is started by the [phase, camOn] effect once the
            // in-call view has mounted its container (avoids a render race).
            setPhase('in-call');
            setRemoteUsers(Array.from(client.remoteUsers));
        } catch (e: any) {
            console.error('Agora join failed:', e);
            const denied = e?.code === 'PERMISSION_DENIED' || e?.name === 'NotAllowedError';
            setErrorMsg(denied
                ? (fr
                    ? 'Accès à la caméra/au micro refusé. Autorisez-les puis réessayez.'
                    : 'Camera/microphone access denied. Please allow them and try again.')
                : (fr
                    ? 'Impossible de rejoindre l’entretien. Veuillez réessayer.'
                    : 'Could not join the interview. Please try again.'));
            setPhase('error');
            await cleanup();
        }
    };

    const leave = async () => {
        await cleanup();
        setRemoteUsers([]);
        setPhase('left');
    };

    const toggleMic = async () => {
        const track = localAudioRef.current;
        if (!track) return;
        await track.setEnabled(!micOn);
        setMicOn(!micOn);
    };

    const toggleCam = async () => {
        const track = localVideoRef.current;
        if (!track) return;
        await track.setEnabled(!camOn);
        setCamOn(!camOn);
    };

    // --- Lobby (pre-join) ---------------------------------------------------
    if (phase === 'lobby' || phase === 'joining') {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-[32px] p-10 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-brand-accent/10 text-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <Video size={30} />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
                        {fr ? 'Entretien vidéo' : 'Video interview'}
                    </h1>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                        {fr
                            ? 'Vous allez rejoindre l’entretien vidéo en ligne. Indiquez votre nom et autorisez l’accès à votre caméra et à votre micro pour démarrer.'
                            : 'You’re about to join the online video interview. Enter your name and allow access to your camera and microphone to start.'}
                    </p>
                    <div className="text-left mb-6">
                        <label className="block text-[11px] uppercase font-bold text-slate-400 mb-2">
                            {fr ? 'Votre nom' : 'Your name'}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim() && phase !== 'joining') join(); }}
                            maxLength={40}
                            autoFocus
                            placeholder={fr ? 'ex. Marie Dupont' : 'e.g. Marie Dupont'}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none text-sm"
                        />
                    </div>
                    <button
                        onClick={join}
                        disabled={phase === 'joining' || !name.trim()}
                        className="w-full py-4 bg-brand-accent text-white font-bold rounded-2xl hover:bg-[#66B2AC] transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {phase === 'joining'
                            ? <><Loader2 size={18} className="animate-spin" /> {fr ? 'Connexion…' : 'Connecting…'}</>
                            : <><Video size={18} /> {fr ? 'Rejoindre l’entretien' : 'Join the interview'}</>}
                    </button>
                </div>
            </div>
        );
    }

    // --- Error / Left -------------------------------------------------------
    if (phase === 'error' || phase === 'left') {
        const isError = phase === 'error';
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-[32px] p-10 text-center shadow-2xl">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${isError ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                        {isError ? <AlertCircle size={30} /> : <PhoneOff size={30} />}
                    </div>
                    <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
                        {isError ? 'Oops!' : (fr ? 'Entretien terminé' : 'Interview ended')}
                    </h1>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        {isError
                            ? errorMsg
                            : (fr ? 'Vous avez quitté l’entretien. Vous pouvez le rejoindre à nouveau.' : 'You left the interview. You can re-join at any time.')}
                    </p>
                    <button
                        onClick={() => { setErrorMsg(null); setPhase('lobby'); }}
                        className="w-full py-4 bg-brand-accent text-white font-bold rounded-2xl hover:bg-[#66B2AC] transition-all"
                    >
                        {fr ? 'Rejoindre à nouveau' : 'Re-join'}
                    </button>
                </div>
            </div>
        );
    }

    // --- In call ------------------------------------------------------------
    // Every participant (you + each remote) gets an equal-sized tile. Tailwind's
    // grid-cols/grid-rows use minmax(0,1fr), so all tiles share width + height.
    // Mobile stacks vertically; desktop lays them side-by-side.
    const participantCount = remoteUsers.length + 1;
    const gridClass =
        participantCount <= 1 ? 'grid-cols-1 auto-rows-fr'
        : participantCount <= 4 ? 'grid-cols-1 sm:grid-cols-2 auto-rows-fr'
        : 'grid-cols-2 sm:grid-cols-3 auto-rows-fr';

    return (
        <div className="h-dvh min-h-screen bg-slate-900 flex flex-col overflow-hidden">
            <div className="flex-1 relative p-3 sm:p-6 min-h-0">
                <div className={`grid gap-3 sm:gap-4 h-full ${gridClass}`}>
                    {/* Your own tile */}
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-800 min-h-0">
                        <div ref={localContainerRef} className="w-full h-full" />
                        {!camOn && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                <VideoOff size={32} />
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-lg max-w-[85%]">
                            {!micOn && <MicOff size={12} className="text-red-400 shrink-0" />}
                            <span className="text-white text-xs font-semibold truncate">{localName} ({fr ? 'vous' : 'you'})</span>
                        </div>
                    </div>

                    {/* Remote participants */}
                    {remoteUsers.map(u => (
                        <div key={u.uid} className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-800 min-h-0">
                            <RemotePlayer user={u} />
                            <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-lg max-w-[85%]">
                                <span className="text-white text-xs font-semibold truncate">{String(u.uid) || 'Participant'}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Waiting hint while you're alone */}
                {remoteUsers.length === 0 && (
                    <div className="absolute top-5 sm:top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 backdrop-blur rounded-full text-slate-200 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-lg whitespace-nowrap">
                        <Users size={14} className="shrink-0" /> {fr ? 'En attente de l’autre participant…' : 'Waiting for the other participant…'}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="shrink-0 bg-slate-900/80 backdrop-blur border-t border-white/5 py-4 sm:py-5 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-4">
                <button
                    onClick={toggleMic}
                    title={micOn ? (fr ? 'Couper le micro' : 'Mute') : (fr ? 'Activer le micro' : 'Unmute')}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${micOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
                >
                    {micOn ? <Mic size={22} /> : <MicOff size={22} />}
                </button>
                <button
                    onClick={toggleCam}
                    title={camOn ? (fr ? 'Couper la caméra' : 'Stop video') : (fr ? 'Activer la caméra' : 'Start video')}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${camOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
                >
                    {camOn ? <Video size={22} /> : <VideoOff size={22} />}
                </button>
                <button
                    onClick={leave}
                    title={fr ? 'Quitter' : 'Leave'}
                    className="w-16 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                    <PhoneOff size={22} />
                </button>
            </div>
        </div>
    );
};
