import React, { useState, useMemo, useEffect, useRef } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MoreVertical,
  Plus,
  Phone,
  MessageCircle,
  Mail,
  Baby,
  Clock,
  Trash2,
  Edit2,
  X,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
  Info,
  Video,
  Link as LinkIcon,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { api, ParentRequest } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { interviewRoomUrl } from '../utils/interview';

declare global {
  interface Window {
    google: any;
  }
}

// --- Types ---


export interface KanbanRequest extends ParentRequest {
  family: string;
  hours: number;
  email: string;
  lastContact: {
    whatsapp: string;
    phone: string;
    email: string;
  };
  childrenDOBs: string[];
  babysitters: Array<{
    name: string;
    rank: number;
    interviewDate: string;
    interviewStatus: 'Scheduled' | 'Completed' | 'Cancelled';
  }>;
  notes: string;
  from_admin: boolean;
}

export interface KanbanColumn {
  id: string; // Will match API board_status "In Matching", etc.
  title: string;
  color: string;
}

export const transformToKanbanRequest = (req: ParentRequest): KanbanRequest => ({
  ...req,
  family: `${req.user.first_name} ${req.user.last_name}`,
  hours: calculateTotalHours(req.schedules || []),
  email: `${req.user.email}`,
  lastContact: {
    whatsapp: '-',
    phone: '-',
    email: '-'
  },
  childrenDOBs: (req.children || []).map(c => c.child_dob),
  babysitters: (req.choices || []).map(c => ({
    name: `${c.babysitter_first_name} ${c.babysitter_last_name}`,
    rank: c.choice_order,
    interviewDate: c.interview_date,
    interviewStatus: 'Scheduled' // Default or map from somewhere if available
  })),
  notes: '',
  from_admin: true
});

const calculateTotalHours = (schedules: any[] = []) => {
  return schedules.reduce((total, s) => {
    return total + (s.slots || []).reduce((slotTotal: number, slot: any) => {
      if (!slot.start_time || !slot.end_time) return slotTotal;
      const [startH, startM] = slot.start_time.split(':').map(Number);
      const [endH, endM] = slot.end_time.split(':').map(Number);
      const duration = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
      return slotTotal + Math.max(0, duration / 60);
    }, 0);
  }, 0);
};

const calculateAge = (dob: string) => {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}${months > 0 ? ` ${months}m` : ''}`;
  }
  return `${months} ${months === 1 ? 'month' : 'months'}`;
};

const INITIAL_COLUMNS: KanbanColumn[] = [
  { id: 'New Leads', title: 'New Leads', color: 'bg-orange-500' },
  { id: 'In Matching', title: 'In Matching', color: 'bg-blue-500' },
  { id: 'Matched', title: 'Matched', color: 'bg-purple-500' },
  { id: 'Contract Signed', title: 'Contract Signed', color: 'bg-emerald-500' },
  { id: 'Lost Clients', title: 'Lost Clients', color: 'bg-slate-400' },
];

// --- Components ---

const SortableColumn = ({
  column,
  requests,
  onRename,
  onDelete,
  onCardClick,
  onContactClick,
  onAddCard
}: {
  column: KanbanColumn;
  requests: KanbanRequest[];
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onCardClick: (req: KanbanRequest) => void;
  onContactClick: (reqId: number, type: 'whatsapp' | 'phone' | 'email') => void;
  onAddCard: (colId: string) => void;
  key?: string | number;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column
    }
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      onRename(column.id, editTitle);
    }
    setIsEditing(false);
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-80 h-full bg-slate-100/50 border-2 border-dashed border-slate-300 rounded-2xl shrink-0"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-80 flex flex-col h-full shrink-0"
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-t-2xl border-b-0 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${column.color}`} />
          {isEditing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="text-sm font-bold text-slate-900 bg-slate-50 border-none outline-none px-1 rounded"
            />
          ) : (
            <h3
              className="text-sm font-bold text-slate-900 cursor-text"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {column.title}
            </h3>
          )}
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {requests.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddCard(column.id);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            title="Add Lead"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(column.id);
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 bg-slate-50/50 border border-slate-200 rounded-b-2xl p-3 space-y-3 overflow-y-auto min-h-[200px]">
        <SortableContext items={requests.map(r => r.id.toString())} strategy={verticalListSortingStrategy}>
          {requests.map((req) => (
            <SortableCard
              key={req.id}
              request={req}
              onClick={() => onCardClick(req)}
              onContactClick={onContactClick}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const SortableCard = ({
  request,
  onClick,
  onContactClick
}: {
  request: KanbanRequest;
  onClick: () => void;
  onContactClick: (reqId: number, type: 'whatsapp' | 'phone' | 'email') => void;
  key?: string | number;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: request.id.toString(),
    data: {
      type: 'Request',
      request
    }
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white/50 border-2 border-dashed border-slate-300 rounded-xl p-4 h-40"
      />
    );
  }

  const { t, formatNumber } = useLanguage();
  const hasSchedules = request.schedules && request.schedules.length > 0;
  const hasSlots = hasSchedules && request.schedules.every((s: any) => s.slots && s.slots.length > 0);
  const hasChoices = request.choices && request.choices.length > 0;
  const isActive = hasSchedules && hasSlots && hasChoices;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group relative"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-slate-900 truncate">{request.user.first_name} {request.user.last_name}</h4>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-accent/5 rounded-full border border-brand-accent/10">
              <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-brand-accent' : 'bg-brand-accent/40'}`} />
              <span className="text-[9px] font-bold text-brand-accent uppercase tracking-wider">
                {isActive ? 'Active' : 'Pending'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">#{request.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Baby size={12} className="text-slate-400" />
            <span>{request.children.length} {request.children.length === 1 ? 'Child' : 'Children'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-slate-400" />
            <span>{formatNumber(calculateTotalHours(request.schedules), 2)}h</span>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (request.user.user_phone) window.location.href = `tel:${request.user.user_phone}`;
            }}
            className="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all group/btn relative"
            title="Call Family"
          >
            <Phone size={14} />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Call Family
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (request.user.user_phone) {
                const formattedPhone = request.user.user_phone.replace(/\D/g, '');
                window.open(`https://wa.me/${formattedPhone}`, '_blank');
              }
            }}
            className="p-2 bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all group/btn relative"
            title="WhatsApp Message"
          >
            <MessageCircle size={14} />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              WhatsApp
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (request.user.email) window.location.href = `mailto:${request.user.email}`;
            }}
            className="p-2 bg-slate-50 text-slate-400 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-all group/btn relative"
            title="Send Email"
          >
            <Mail size={14} />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Email
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Kanban Component ---

export const KanbanBoard: React.FC<{ initialRequests: ParentRequest[] }> = ({ initialRequests }) => {
  const { t, formatNumber } = useLanguage();
  const [columns, setColumns] = useState<KanbanColumn[]>(INITIAL_COLUMNS);
  const [requests, setRequests] = useState<KanbanRequest[]>(() =>
    initialRequests.map(transformToKanbanRequest)
  );
  const [activeRequest, setActiveRequest] = useState<KanbanRequest | null>(null);

  React.useEffect(() => {
    setRequests(initialRequests.map(transformToKanbanRequest));
  }, [initialRequests]);
  const [isAddingToColumn, setIsAddingToColumn] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'Column' | 'Request' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const type = event.active.data.current?.type;
    setActiveType(type);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveARequest = active.data.current?.type === 'Request';
    const isOverARequest = over.data.current?.type === 'Request';

    if (!isActiveARequest) return;

    // Dropping a Request over another Request
    if (isActiveARequest && isOverARequest) {
      setRequests((prev) => {
        const activeIndex = prev.findIndex((r) => r.id.toString() === activeId);
        const overIndex = prev.findIndex((r) => r.id.toString() === overId);

        if (prev[activeIndex].board_status !== prev[overIndex].board_status) {
          const newRequests = [...prev];
          newRequests[activeIndex] = { ...newRequests[activeIndex], board_status: prev[overIndex].board_status };
          return arrayMove(newRequests, activeIndex, overIndex);
        }

        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    // Dropping a Request over a Column
    const isOverAColumn = over.data.current?.type === 'Column';
    if (isActiveARequest && isOverAColumn) {
      setRequests((prev) => {
        const activeIndex = prev.findIndex((r) => r.id.toString() === activeId);
        const newRequests = [...prev];
        newRequests[activeIndex] = { ...newRequests[activeIndex], board_status: overId };
        return arrayMove(newRequests, activeIndex, activeIndex);
      });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setActiveType(null);

    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const isActiveAColumn = active.data.current?.type === 'Column';

    // 1. If it's a Column being dragged, reorder columns
    if (isActiveAColumn) {
      if (activeId === overId) return;
      setColumns((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === activeId);
        const overIndex = prev.findIndex((c) => c.id === overId);
        return arrayMove(prev, activeIndex, overIndex);
      });
      return;
    }

    // 2. If it's a Request being dragged, `onDragOver` has ALREADY updated the `requests` state.
    // HOWEVER, we need to ensure the final ordering if it dropped on the exact same place in the new column or reordered.
    setRequests((prev) => {
      let finalRequests = [...prev];
      const activeIndex = finalRequests.findIndex((r) => r.id.toString() === activeId);

      if (activeIndex !== -1) {
        if (activeId !== overId) {
          const isOverARequest = over.data.current?.type === 'Request';
          const isOverAColumn = over.data.current?.type === 'Column';

          if (isOverARequest) {
            const overIndex = finalRequests.findIndex((r) => r.id.toString() === overId);
            if (overIndex !== -1) {
              if (finalRequests[activeIndex].board_status !== finalRequests[overIndex].board_status) {
                finalRequests[activeIndex] = { ...finalRequests[activeIndex], board_status: finalRequests[overIndex].board_status };
              }
              finalRequests = arrayMove(finalRequests, activeIndex, overIndex);
            }
          } else if (isOverAColumn) {
            finalRequests[activeIndex] = { ...finalRequests[activeIndex], board_status: overId };
          }
        }

        // Make API Call with the finalized status and order
        const request = finalRequests.find(r => r.id.toString() === activeId);
        if (!request) return finalRequests;

        const newStatus = request.board_status;
        const columnRequests = finalRequests.filter((r) => r.board_status === newStatus);

        // Find the correct index in the newly sorted array and add 1
        const newOrder = columnRequests.findIndex((r) => r.id === request.id) + 1;



        api.updateBoardStatus({
          parent_request_id: request.id,
          board_status: newStatus,
          board_order: newOrder,
        }).catch(err => console.error("API Error updating board status:", err));
      }
      return finalRequests;
    });
  };

  const handleAddColumn = () => {
    const newId = `col-${Date.now()}`;
    setColumns([...columns, { id: newId, title: 'New Status', color: 'bg-slate-400' }]);
  };

  const handleRenameColumn = (id: string, newTitle: string) => {
    setColumns(columns.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const handleDeleteColumn = (id: string) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter(c => c.id !== id));
    // Reassign requests to the first available column
    const firstColId = columns.find(c => c.id !== id)?.id || '';
    setRequests(requests.map(r => r.board_status === id ? { ...r, board_status: firstColId } : r));
  };

  const handleContactClick = (reqId: number, type: 'whatsapp' | 'phone' | 'email') => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

    setRequests(requests.map(r => r.id === reqId ? {
      ...r,
      lastContact: { ...r.lastContact, [type]: formattedDate }
    } : r));
  };

  const handleUpdateRequest = async (reqId: number, updatedFields: Partial<KanbanRequest>) => {
    try {
      // Clean children payload - ensure we send IDs if they exist
      const childrenPayload = (updatedFields.children || []).map((c: any) => ({
        id: c.id,
        child_dob: c.child_dob
      }));

      // Clean choices payload - map back to BabysitterChoicePayload structure
      const choicesPayload = (updatedFields.choices || []).map((c: any) => ({
        choice_order: c.choice_order,
        bb_bs_id: c.bb_bs_id,
        babysitter_first_name: c.babysitter_first_name,
        babysitter_last_name: c.babysitter_last_name,
        babysitter_email: c.babysitter_email,
        babysitter_phone: c.babysitter_phone,
        babysitter_address: c.babysitter_address,
        interview_date: c.interview_date,
        interview_time: c.interview_time
      }));

      // ✅ Clean schedules payload
      const schedulesPayload = (updatedFields.schedules || []).map((s: any) => ({
        schedule_date: s.schedule_date,
        slots: (s.slots || []).map((slot: any) => ({
          start_time: slot.start_time,
          end_time: slot.end_time
        }))
      }));

      const response = await api.updateParentRequest(reqId, {
        email: updatedFields.email || '',
        children: childrenPayload,
        choices: choicesPayload,
        schedules: schedulesPayload, 
        hourly_rate: updatedFields.hourly_rate,
        _method: 'put'
      } as any);

      if (response.status && response.data) {
        const fullReq = transformToKanbanRequest(response.data);
        setRequests(prev => prev.map(r => r.id === reqId ? fullReq : r));
        if (activeRequest?.id === reqId) {
          setActiveRequest(fullReq);
        }
      } else {
        console.error('Update failed:', response.message);
      }
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  };

  const handleCreateRequest = async (newReq: any) => {
    try {
      const response = await api.createParentRequest({
        first_name: newReq.first_name,
        last_name: newReq.last_name,
        email: newReq.email,
        user_phone: newReq.user_phone || '',
        parent_address: newReq.parent_address,
        children: newReq.children.map((c: any) => ({ child_dob: c.child_dob })),
        schedules: newReq.schedules,
        hourly_rate: newReq.hourly_rate,
        board_status: isAddingToColumn || 'New Leads',
        from_admin: true,
      });

      if (response.status && response.data) {
        // response.data is the full ParentRequest object from the API
        const fullReq = transformToKanbanRequest(response.data);
        setRequests(prev => [fullReq, ...prev]);
        setIsAddingToColumn(null);
      }
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };

  const handleUpdateDraft = (draft: any) => {
    // This is for the autosave behavior
    // In a real app, we might update a draft in the backend
    // For now, we'll just handle the final creation
  };

  return (
    <div className="h-[calc(100vh-220px)] flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex h-full gap-6 px-1">
            <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {columns.map((col) => (
                <SortableColumn
                  key={col.id}
                  column={col}
                  requests={requests.filter(r => r.board_status === col.id)}
                  onRename={handleRenameColumn}
                  onDelete={handleDeleteColumn}
                  onCardClick={setActiveRequest}
                  onContactClick={handleContactClick}
                  onAddCard={setIsAddingToColumn}
                />
              ))}
            </SortableContext>

            {/* Add Column Button */}
            <button
              onClick={handleAddColumn}
              className="w-80 h-14 bg-white border border-slate-200 border-dashed rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shrink-0"
            >
              <Plus size={20} />
              <span className="font-bold text-sm">Add New Status</span>
            </button>
          </div>
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeId && activeType === 'Column' && (
            <div className="w-80 h-full bg-white border border-slate-200 rounded-2xl shadow-2xl opacity-90">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${columns.find(c => c.id === activeId)?.color}`} />
                <h3 className="text-sm font-bold text-slate-900">{columns.find(c => c.id === activeId)?.title}</h3>
              </div>
            </div>
          )}
          {activeId && activeType === 'Request' && (
            <div className="w-72 bg-white p-4 rounded-xl border border-slate-200 shadow-2xl opacity-90">
              <h4 className="font-bold text-slate-900">{requests.find(r => r.id === activeId)?.family}</h4>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Details Modal */}
      <AnimatePresence>
        {activeRequest && (
          <RequestDetailsModal
            request={activeRequest}
            onClose={() => setActiveRequest(null)}
            onUpdate={(updatedFields) => handleUpdateRequest(activeRequest.id, updatedFields)}
          />
        )}
        {isAddingToColumn && (
          <NewRequestModal
            onClose={() => setIsAddingToColumn(null)}
            onCreate={handleCreateRequest}
            onUpdateDraft={handleUpdateDraft}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Modal Components ---

const NewRequestModal = ({
  onClose,
  onCreate,
  onUpdateDraft
}: {
  onClose: () => void;
  onCreate: (req: any) => void;
  onUpdateDraft: (req: any) => void;
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    parent_address: '',
    children: [{ child_dob: '' }],
    schedules: [
      {
        schedule_date: '',
        slots: [{ start_time: '', end_time: '' }]
      }
    ],
    hourly_rate: '27.99',
    user_language: 'en' as 'en' | 'fr',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
  });

  const parentAddressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!parentAddressRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(parentAddressRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'geometry']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || '';
        
        setFormData(prev => ({
          ...prev,
          parent_address: address,
          lat,
          lng
        }));
        
        // Update draft for parent component
        onUpdateDraft({
          ...formData,
          parent_address: address,
          lat,
          lng
        });
      }
    });

    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [window.google]);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onUpdateDraft(newData);
  };

  const handleAddChild = () => {
    const newChildren = [...formData.children, { child_dob: '' }];
    handleChange('children', newChildren);
  };

  const handleChildDOBChange = (index: number, dob: string) => {
    const newChildren = [...formData.children];
    newChildren[index] = { child_dob: dob };
    handleChange('children', newChildren);
  };

  const handleRemoveChild = (index: number) => {
    const newChildren = formData.children.filter((_, i) => i !== index);
    handleChange('children', newChildren);
  };

  const handleAddSchedule = () => {
    const newSchedules = [
      ...formData.schedules,
      {
        schedule_date: '',
        slots: [{ start_time: '', end_time: '' }]
      }
    ];
    handleChange('schedules', newSchedules);
  };

  const handleRemoveSchedule = (index: number) => {
    const newSchedules = formData.schedules.filter((_, i) => i !== index);
    handleChange('schedules', newSchedules);
  };

  const handleScheduleDateChange = (index: number, date: string) => {
    const newSchedules = [...formData.schedules];
    newSchedules[index] = { ...newSchedules[index], schedule_date: date };
    handleChange('schedules', newSchedules);
  };

  const handleAddSlot = (scheduleIndex: number) => {
    const newSchedules = [...formData.schedules];
    newSchedules[scheduleIndex].slots = [
      ...newSchedules[scheduleIndex].slots,
      { start_time: '', end_time: '' }
    ];
    handleChange('schedules', newSchedules);
  };

  const handleRemoveSlot = (scheduleIndex: number, slotIndex: number) => {
    const newSchedules = [...formData.schedules];
    newSchedules[scheduleIndex].slots = newSchedules[scheduleIndex].slots.filter((_, i) => i !== slotIndex);
    handleChange('schedules', newSchedules);
  };

  const handleSlotChange = (scheduleIndex: number, slotIndex: number, field: 'start_time' | 'end_time', value: string) => {
    const newSchedules = [...formData.schedules];
    // Ensure value is in HH:mm:ss format if it's just HH:mm
    const formattedValue = value.length === 5 ? `${value}:00` : value;
    newSchedules[scheduleIndex].slots[slotIndex] = {
      ...newSchedules[scheduleIndex].slots[slotIndex],
      [field]: formattedValue
    };
    handleChange('schedules', newSchedules);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Add New Lead</h2>
              <p className="text-xs text-slate-400 font-medium">Capture family details with dynamic scheduling</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Family Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User size={14} /> Parent Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">First Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ahmed"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Khan"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email Address</label>
                <input
                  type="email"
                  placeholder="ahmedkhan@gmail.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Parent Address</label>
                <input
                  ref={parentAddressRef}
                  type="text"
                  placeholder="DHA Phase 6, Lahore"
                  defaultValue={formData.parent_address}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Hourly Rate (€)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="27.99"
                  value={formData.hourly_rate}
                  onChange={(e) => handleChange('hourly_rate', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5 focus-within:z-10">
                {/* Bloom Buddies Babysitter ID field removed */}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Preferred Language</label>
                <div className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                  <button
                    onClick={() => handleChange('user_language', 'en')}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${formData.user_language === 'en' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => handleChange('user_language', 'fr')}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${formData.user_language === 'fr' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Français
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Children */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Baby size={14} /> Children
              </h3>
              <button
                onClick={handleAddChild}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={12} /> Add Child
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formData.children.map((child, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 relative group">
                  <button
                    onClick={() => handleRemoveChild(idx)}
                    className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Child {idx + 1} DOB</label>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {calculateAge(child.child_dob) || 'Enter DOB'}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={child.child_dob}
                    onChange={(e) => handleChildDOBChange(idx, e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-medium"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Dynamic Schedule
              </h3>
              <button
                onClick={handleAddSchedule}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={12} /> Add Date
              </button>
            </div>
            <div className="space-y-6">
              {formData.schedules.map((schedule, sIdx) => (
                <div key={sIdx} className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] relative group space-y-4">
                  <button
                    onClick={() => handleRemoveSchedule(sIdx)}
                    className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="w-full sm:w-1/2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Schedule Date</label>
                    <input
                      type="date"
                      value={schedule.schedule_date}
                      onChange={(e) => handleScheduleDateChange(sIdx, e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Time Slots</label>
                      <button
                        onClick={() => handleAddSlot(sIdx)}
                        className="text-[9px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus size={10} /> Add Slot
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {schedule.slots.map((slot, tIdx) => (
                        <div key={tIdx} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 relative group/slot">
                          <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">Start</label>
                            <input
                              type="time"
                              value={slot.start_time.substring(0, 5)}
                              onChange={(e) => handleSlotChange(sIdx, tIdx, 'start_time', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900"
                            />
                          </div>
                          <div className="w-px h-8 bg-slate-100" />
                          <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">End</label>
                            <input
                              type="time"
                              value={slot.end_time.substring(0, 5)}
                              onChange={(e) => handleSlotChange(sIdx, tIdx, 'end_time', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900"
                            />
                          </div>
                          {schedule.slots.length > 1 && (
                            <button
                              onClick={() => handleRemoveSlot(sIdx, tIdx)}
                              className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/slot:opacity-100 transition-all"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-medium italic">All fields are required for a complete lead profile</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onCreate(formData)}
              className="px-8 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              Create Request
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const RequestDetailsModal = ({
  request,
  onClose,
  onUpdate,
  showOnlySitters = false,
  hideBabysittersTab = false
}: {
  request: KanbanRequest;
  onClose: () => void;
  onUpdate: (updatedFields: Partial<KanbanRequest>) => void;
  showOnlySitters?: boolean;
  hideBabysittersTab?: boolean;
}) => {
  const { t, formatNumber } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'sitters'>(showOnlySitters ? 'sitters' : 'overview');
  const [formData, setFormData] = useState<KanbanRequest>({
    ...request,
    schedules: request.schedules || [],
    choices: request.choices || [],
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const parentAddressDetailsRef = useRef<HTMLInputElement>(null);
  const babysitterAddressRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!parentAddressDetailsRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(parentAddressDetailsRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'geometry']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || '';
        
        setFormData(prev => ({
          ...prev,
          parent_address: address,
          lat,
          lng
        }));
      }
    });

    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [window.google]);

  useEffect(() => {
    if (!window.google) return;

    const autocompletes = babysitterAddressRefs.current.map((ref, idx) => {
      if (!ref) return null;
      const ac = new window.google.maps.places.Autocomplete(ref, {
        types: ['address'],
        fields: ['formatted_address', 'geometry']
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address || '';
          handleSitterChange(idx, 'babysitter_address', address);
          // Assuming choice objects need lat/lng
          const newChoices = [...(formData.choices || [])];
          if (newChoices[idx]) {
            (newChoices[idx] as any).lat = lat;
            (newChoices[idx] as any).lng = lng;
            setFormData(prev => ({ ...prev, choices: newChoices }));
          }
        }
      });
      return ac;
    });

    return () => {
      autocompletes.forEach(ac => {
        if (ac) window.google.maps.event.clearInstanceListeners(ac);
      });
    };
  }, [formData.choices?.length, window.google]);

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    if (field === 'schedule') {
      newData.hours = calculateTotalHours(value);
    }
    setFormData(newData);
  };

  const handleChildDOBChange = (index: number, dob: string) => {
    const newDOBs = [...formData.childrenDOBs];
    newDOBs[index] = dob;

    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], child_dob: dob };

    setFormData({ ...formData, childrenDOBs: newDOBs, children: newChildren });
  };

  const handleAddChild = () => {
    const newDOBs = [...formData.childrenDOBs, ''];
    const newChildren = [...formData.children, { child_dob: '' }];
    setFormData({ ...formData, childrenDOBs: newDOBs, children: newChildren });
  };

  const handleRemoveChild = (index: number) => {
    const newDOBs = formData.childrenDOBs.filter((_, i) => i !== index);
    const newChildren = formData.children.filter((_, i) => i !== index);
    setFormData({ ...formData, childrenDOBs: newDOBs, children: newChildren });
  };

  const handleScheduleChange = (scheduleIndex: number, field: string, value: string) => {
    const newSchedules = [...formData.schedules];
    newSchedules[scheduleIndex] = { ...newSchedules[scheduleIndex], [field]: value };
    handleChange('schedules', newSchedules);
  };

  const handleAddSchedule = () => {
    handleChange('schedules', [...formData.schedules, { schedule_date: '', slots: [{ start_time: '', end_time: '' }] }]);
  };

  const handleRemoveSchedule = (index: number) => {
    const newSchedules = formData.schedules.filter((_, i) => i !== index);
    handleChange('schedules', newSchedules);
  };

  const handleSlotChange = (scheduleIndex: number, slotIndex: number, field: string, value: string) => {
    const newSchedules = [...formData.schedules];
    const formattedValue = value.length === 5 ? `${value}:00` : value;
    newSchedules[scheduleIndex].slots[slotIndex] = { ...newSchedules[scheduleIndex].slots[slotIndex], [field]: formattedValue };
    handleChange('schedules', newSchedules);
  };

  const handleAddSlot = (scheduleIndex: number) => {
    const newSchedules = [...formData.schedules];
    newSchedules[scheduleIndex].slots = [...newSchedules[scheduleIndex].slots, { start_time: '', end_time: '' }];
    handleChange('schedules', newSchedules);
  };

  const handleRemoveSlot = (scheduleIndex: number, slotIndex: number) => {
    const newSchedules = [...formData.schedules];
    newSchedules[scheduleIndex].slots = newSchedules[scheduleIndex].slots.filter((_, i) => i !== slotIndex);
    handleChange('schedules', newSchedules);
  };

  const handleSitterChange = (index: number, field: string, value: any) => {
    const newChoices = [...(formData.choices || [])];
    if (newChoices[index]) {
      newChoices[index] = { ...newChoices[index], [field]: value };

      // Also update babysitters array for local state/UI consistency if needed
      const newSitters = [...formData.babysitters];
      if (field === 'babysitter_first_name' || field === 'babysitter_last_name') {
        newSitters[index] = {
          ...newSitters[index],
          name: `${newChoices[index].babysitter_first_name} ${newChoices[index].babysitter_last_name}`
        };
      } else if (field === 'interview_date') {
        newSitters[index] = { ...newSitters[index], interviewDate: value };
      }

      setFormData({ ...formData, choices: newChoices, babysitters: newSitters });
    }
  };

  const handleAddSitter = () => {
    const nextOrder = (formData.choices?.length || 0) + 1;
    const newChoice = {
      id: 0, // Temp
      user_id: formData.user_id,
      parent_request_id: formData.id,
      choice_order: nextOrder,
      babysitter_first_name: '',
      babysitter_last_name: '',
      babysitter_email: '',
      babysitter_phone: '',
      babysitter_address: '',
      interview_date: '',
      interview_time: '12:00'
    };

    const newSitter = {
      name: '',
      rank: nextOrder,
      interviewDate: '',
      interviewStatus: 'Scheduled' as const
    };

    setFormData({
      ...formData,
      choices: [...(formData.choices || []), newChoice as any],
      babysitters: [...formData.babysitters, newSitter]
    });
  };

  const handleRemoveSitter = (index: number) => {
    const newChoices = (formData.choices || []).filter((_, i) => i !== index);
    const newSitters = formData.babysitters.filter((_, i) => i !== index);
    setFormData({ ...formData, choices: newChoices, babysitters: newSitters });
  };

  const handleSave = () => {
    // Check if children or schedules have changed
    const childrenChanged = JSON.stringify(formData.children.map(c => ({ id: c.id, dob: c.child_dob }))) !== 
                          JSON.stringify((request.children || []).map(c => ({ id: c.id, dob: c.child_dob })));
    
    const schedulesChanged = JSON.stringify(formData.schedules.map(s => ({ date: s.schedule_date, slots: s.slots.map((sl: any) => ({ start: sl.start_time, end: sl.end_time })) }))) !== 
                            JSON.stringify((request.schedules || []).map(s => ({ date: s.schedule_date, slots: s.slots.map((sl: any) => ({ start: sl.start_time, end: sl.end_time })) })));

    onUpdate(formData);
    
    if (childrenChanged || schedulesChanged) {
      setShowSuccess(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        {!showSuccess && (
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                <User size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{formData.user.first_name} {formData.user.last_name}</h2>
                <p className="text-sm text-slate-400 font-medium">Request #{formData.id} • {formData.board_status.replace('-', ' ')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-900"
            >
              <X size={24} />
            </button>
          </div>
        )}

        {/* Modal Tabs */}
        {!showSuccess && !showOnlySitters && (
          <div className="px-8 pt-4 flex items-center gap-8 border-b border-slate-100">
            {[
              { id: 'overview', label: 'Overview', icon: Info },
              { id: 'schedule', label: 'Schedule', icon: Calendar },
              ...(hideBabysittersTab ? [] : [{ id: 'sitters', label: 'Babysitters', icon: Baby }]),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Modal Content */}
        {!showSuccess && (
          <div className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && (
                <div className="space-y-8">
                  {formData.schedules && formData.schedules.length > 0 && formData.schedules.every(s => s.slots && s.slots.length > 0) && (
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => {
                          const link = `https://ponctuel.bloom-buddies.fr/price/${formData.id}`;
                          navigator.clipboard.writeText(link);
                          toast.success('Price Quote link copied!');
                        }}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-2 border border-emerald-100"
                      >
                        <LinkIcon size={14} /> Copy Price Quote Link
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Family Information</h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">First Name</label>
                            <input
                              type="text"
                              value={formData.user.first_name}
                              onChange={(e) => {
                                const newUser = { ...formData.user, first_name: e.target.value };
                                setFormData({
                                  ...formData,
                                  user: newUser,
                                  family: `${newUser.first_name} ${newUser.last_name}`
                                });
                              }}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Last Name</label>
                            <input
                              type="text"
                              value={formData.user.last_name}
                              onChange={(e) => {
                                const newUser = { ...formData.user, last_name: e.target.value };
                                setFormData({
                                  ...formData,
                                  user: newUser,
                                  family: `${newUser.first_name} ${newUser.last_name}`
                                });
                              }}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Children DOBs</label>
                            <button onClick={handleAddChild} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">+ Add Child</button>
                          </div>
                          <div className="space-y-2">
                            {formData.childrenDOBs.map((dob, i) => (
                              <div key={i} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl group">
                                <input
                                  type="date"
                                  value={dob}
                                  onChange={(e) => handleChildDOBChange(i, e.target.value)}
                                  className="flex-1 px-3 py-1.5 bg-slate-50 border-none outline-none text-xs font-bold rounded"
                                />
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                                  {calculateAge(dob)}
                                </span>
                                <button
                                  onClick={() => handleRemoveChild(i)}
                                  className="p-1.5 text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email</label>
                          <input
                            type="text"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Parent Address</label>
                          <input
                            ref={parentAddressDetailsRef}
                            type="text"
                            defaultValue={formData.parent_address}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Hourly Rate (€)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={formData.hourly_rate || ''}
                            onChange={(e) => handleChange('hourly_rate', e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-1.5 focus-within:z-10">
                          {/* Bloom Buddies Babysitter ID field removed */}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Preferred Language</label>
                          <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-xl">
                            <button
                              type="button"
                              onClick={() => {
                                const newUser = { ...formData.user, user_language: 'en' as const };
                                setFormData({ ...formData, user: newUser });
                              }}
                              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${formData.user?.user_language === 'en' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              English
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newUser = { ...formData.user, user_language: 'fr' as const };
                                setFormData({ ...formData, user: newUser });
                              }}
                              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${formData.user?.user_language === 'fr' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              Français
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Details</h4>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Phone</label>
                          <PhoneInput
                            country={'fr'}
                            value={formData.lastContact.phone}
                            onChange={(phone) => handleChange('lastContact', { ...formData.lastContact, phone })}
                            enableSearch={true}
                            inputClass="!w-full !h-[40px] !bg-white !border !border-slate-200 !rounded-xl !text-xs !font-bold !pl-12 focus:!ring-2 focus:!ring-slate-900/10 focus:!border-slate-900"
                            containerClass="phone-input-container"
                            buttonClass="!bg-transparent !border-none !rounded-l-xl"
                            searchClass="!bg-white !text-slate-900"
                            dropdownClass="!bg-white !text-slate-900 !rounded-xl !shadow-xl !border-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Detailed Schedule</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Manage all dates and times for this request. Total: <span className="text-slate-900 font-bold">{formatNumber(formData.hours, 2)}h</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleAddSchedule}
                        className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-sm"
                      >
                        + Add New Date
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {formData.schedules.map((schedule, sIdx) => (
                      <div key={sIdx} className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] relative group space-y-4">
                        <button
                          onClick={() => handleRemoveSchedule(sIdx)}
                          className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="w-full sm:w-1/2 space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Schedule Date</label>
                          <input
                            type="date"
                            value={schedule.schedule_date}
                            onChange={(e) => handleScheduleChange(sIdx, 'schedule_date', e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Time Slots</label>
                            <button
                              onClick={() => handleAddSlot(sIdx)}
                              className="text-[9px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Plus size={10} /> Add Slot
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {schedule.slots.map((slot, tIdx) => (
                              <div key={tIdx} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 relative group/slot">
                                <div className="flex-1 space-y-1">
                                  <label className="text-[8px] font-bold text-slate-400 uppercase">Start</label>
                                  <input
                                    type="time"
                                    value={slot.start_time.substring(0, 5)}
                                    onChange={(e) => handleSlotChange(sIdx, tIdx, 'start_time', e.target.value)}
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900"
                                  />
                                </div>
                                <div className="w-px h-8 bg-slate-100" />
                                <div className="flex-1 space-y-1">
                                  <label className="text-[8px] font-bold text-slate-400 uppercase">End</label>
                                  <input
                                    type="time"
                                    value={slot.end_time.substring(0, 5)}
                                    onChange={(e) => handleSlotChange(sIdx, tIdx, 'end_time', e.target.value)}
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900"
                                  />
                                </div>
                                {schedule.slots.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveSlot(sIdx, tIdx)}
                                    className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/slot:opacity-100 transition-all"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.schedules.length === 0 && (
                      <div className="p-12 text-center bg-white border border-slate-200 rounded-[24px]">
                        <Calendar size={40} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-sm font-medium text-slate-400">No dates scheduled yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'sitters' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Babysitter Selection</h3>
                    <button onClick={handleAddSitter} className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all">
                      + Add Sitter
                    </button>
                  </div>
                  {formData.choices && formData.choices.length > 0 ? (
                    <div className="space-y-6">
                      {formData.choices.map((choice, idx) => (
                        <div key={idx} className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col gap-4 relative group">
                          <button
                            onClick={() => handleRemoveSitter(idx)}
                            className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">First Name</label>
                              <input
                                type="text"
                                value={choice.babysitter_first_name}
                                onChange={(e) => handleSitterChange(idx, 'babysitter_first_name', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Last Name</label>
                              <input
                                type="text"
                                value={choice.babysitter_last_name}
                                onChange={(e) => handleSitterChange(idx, 'babysitter_last_name', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                              <input
                                type="email"
                                value={choice.babysitter_email}
                                onChange={(e) => handleSitterChange(idx, 'babysitter_email', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                              <PhoneInput
                                country={'fr'}
                                value={choice.babysitter_phone}
                                onChange={(phone) => handleSitterChange(idx, 'babysitter_phone', phone)}
                                enableSearch={true}
                                inputClass="!w-full !h-[38px] !bg-slate-50 !border !border-slate-100 !rounded-lg !text-sm !font-bold !pl-12 focus:!bg-white focus:!ring-2 focus:!ring-slate-900/10 focus:!border-slate-900"
                                containerClass="phone-input-container shadow-none"
                                buttonClass="!bg-transparent !border-none !rounded-l-lg hover:!bg-slate-100"
                                searchClass="!bg-white !text-slate-900"
                                dropdownClass="!bg-white !text-slate-900 !rounded-xl !shadow-xl !border-slate-100"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Address</label>
                              <input
                                ref={el => babysitterAddressRefs.current[idx] = el}
                                type="text"
                                defaultValue={choice.babysitter_address}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Interview Date</label>
                              <input
                                type="date"
                                value={choice.interview_date}
                                onChange={(e) => handleSitterChange(idx, 'interview_date', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold"
                              />
                            </div>

                            <div className="flex gap-4">
                              <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Interview Time</label>
                                <input
                                  type="time"
                                  value={choice.interview_time}
                                  onChange={(e) => handleSitterChange(idx, 'interview_time', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold"
                                />
                              </div>
                              <div className="w-24 space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Order</label>
                                <input
                                  type="number"
                                  value={choice.choice_order}
                                  onChange={(e) => handleSitterChange(idx, 'choice_order', parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">BB Babysitter ID</label>
                              <input
                                type="text"
                                placeholder="Paste BB Babysitter ID here"
                                value={choice.bb_bs_id || ''}
                                onChange={(e) => handleSitterChange(idx, 'bb_bs_id', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold"
                              />
                            </div>

                            <div className="md:col-span-2 pt-2 border-t border-slate-50">
                              {choice.interview_date && choice.id ? (
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <a
                                    href={interviewRoomUrl(choice.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-blue/10 text-brand-blue font-bold rounded-xl hover:bg-brand-blue hover:text-white transition-all text-xs"
                                  >
                                    <Video size={14} />
                                    Join Meeting
                                  </a>
                                  {choice.bb_bs_id && (
                                    <a
                                      href={`https://bloom-buddies.fr/babysitter/${choice.bb_bs_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-xs border border-emerald-100"
                                    >
                                      <ExternalLink size={14} />
                                      View Profile
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <button
                                    disabled
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-300 font-bold rounded-xl cursor-not-allowed text-xs"
                                  >
                                    <Video size={14} />
                                    Join Meeting
                                  </button>
                                  {choice.bb_bs_id && (
                                    <a
                                      href={`https://bloom-buddies.fr/babysitter/${choice.bb_bs_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-xs border border-emerald-100"
                                    >
                                      <ExternalLink size={14} />
                                      View Profile
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Baby size={40} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-400 font-medium">No babysitters selected yet.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        )}

        {/* Modal Footer */}
        {!showSuccess && (
          <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-medium italic">Changes will be saved to the CRM</p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {showSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center p-16 text-center space-y-8 h-full"
          >
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center shadow-inner animate-in zoom-in duration-500">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-slate-900">Success!</h2>
              <p className="text-slate-600 font-bold text-lg">Price quote sent successfully</p>
            </div>
            <p className="text-slate-400 max-w-xs leading-relaxed font-medium">
              The request has been updated and the automated system has regenerated the quote with your changes.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
              <button
                onClick={() => {
                  const link = `https://ponctuel.bloom-buddies.fr/price/${formData.id}`;
                  navigator.clipboard.writeText(link);
                  toast.success('Price Quote link copied!');
                }}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-50 text-emerald-600 text-sm font-black rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <LinkIcon size={18} />
                Copy Price Quote
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-12 py-4 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
