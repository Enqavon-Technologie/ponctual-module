// Helpers for the Agora video-interview rooms.
//
// Each interview maps to a deterministic Agora channel derived from the choice
// id, so both the family and the babysitter who open the same link land in the
// same room. Agora creates the channel implicitly on the first join — whoever
// opens the link first effectively "creates" the meeting room.

export const interviewChannel = (choiceId: number | string): string =>
    `interview_${choiceId}`;

/** Full, shareable URL to the in-app video room for a given choice. */
export const interviewRoomUrl = (choiceId: number | string): string =>
    `${window.location.origin}/interview/${interviewChannel(choiceId)}`;
