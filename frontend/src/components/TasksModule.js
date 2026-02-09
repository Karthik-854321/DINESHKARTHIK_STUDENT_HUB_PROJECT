import { useEffect, useState, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, GripVertical, Trash2, CheckCircle2, Circle, Calendar } from 'lucide-react';
import api from '../lib/api';

const priorityColors = {
  high: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
};

const SortableTask = ({ task, onToggle, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const pc = priorityColors[task.priority] || priorityColors.medium;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-panel rounded-2xl p-4 flex items-start gap-3 group transition-all ${task.status === 'completed' ? 'opacity-50' : ''}`}
      data-testid={`task-item-${task.id}`}
    >
      <button {...attributes} {...listeners} className="mt-1 text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
      <button onClick={() => onToggle(task)} className="mt-0.5 flex-shrink-0" data-testid={`task-toggle-${task.id}`}>
        {task.status === 'completed' ? (
          <CheckCircle2 size={20} className="text-[#39ff14]" />
        ) : (
          <Circle size={20} className="text-white/30 hover:text-white/60" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-white/40' : 'text-white'}`}>{task.title}</p>
        {task.description && <p className="text-xs text-white/30 mt-0.5 truncate">{task.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {task.due_date && (
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <Calendar size={10} /> {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.category && task.category !== 'General' && (
            <span className="text-[10px] text-white/30">{task.category}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="outline" className={`${pc.bg} ${pc.text} ${pc.border} text-[10px] uppercase tracking-wider border`}>
          {task.priority}
        </Badge>
        {isOverdue && (
          <Badge className="bg-red-500/20 text-red-400 text-[10px] uppercase tracking-wider">Overdue</Badge>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
          data-testid={`task-delete-${task.id}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export const TasksModule = () => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks', { params: filter !== 'all' ? { status: filter } : {} });
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.post('/tasks', { title, description, category, priority, due_date: dueDate || null });
      setTitle(''); setDescription(''); setDueDate('');
      fetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleToggle = async (task) => {
    const newStatus = task.status === 'completed' ? 'active' : 'completed';
    await api.put(`/tasks/${task.id}`, { status: newStatus });
    fetchTasks();
  };

  const handleDelete = async (taskId) => {
    await api.delete(`/tasks/${taskId}`);
    fetchTasks();
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const newTasks = arrayMove(tasks, oldIndex, newIndex);
    setTasks(newTasks);
    await api.put('/tasks/reorder/batch', { task_ids: newTasks.map((t) => t.id) });
  };

  return (
    <div className="relative z-10 p-4 md:p-8 pb-32 max-w-4xl mx-auto" data-testid="tasks-view">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Tasks</h1>
        <p className="text-white/40 text-sm mt-1">Manage your daily directives</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'active', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            data-testid={`task-filter-${f}`}
            className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all ${
              filter === f ? 'bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/30' : 'text-white/40 hover:text-white/60 border border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Create Task Form */}
      <form onSubmit={handleAdd} className="glass-panel rounded-3xl p-6 mb-8" data-testid="create-task-form">
        <p className="text-sm font-semibold text-white mb-4 tracking-wide uppercase">Create New Task</p>
        <div className="space-y-3">
          <Input
            data-testid="task-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-black/30 border-white/10 rounded-xl text-white" data-testid="task-category-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1221] border-white/10">
                {['General', 'Academics', 'Work', 'Personal'].map((c) => (
                  <SelectItem key={c} value={c} className="text-white hover:bg-white/10">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="bg-black/30 border-white/10 rounded-xl text-white" data-testid="task-priority-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1221] border-white/10">
                {['low', 'medium', 'high'].map((p) => (
                  <SelectItem key={p} value={p} className="text-white hover:bg-white/10 capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            data-testid="task-desc-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20"
          />
          <Input
            data-testid="task-due-date-input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-black/30 border-white/10 rounded-xl text-white"
          />
          <Button
            type="submit"
            data-testid="add-task-btn"
            className="w-full rounded-full bg-[#39ff14] text-black font-bold hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all"
          >
            <Plus size={16} className="mr-1" /> Add Task
          </Button>
        </div>
      </form>

      {/* Task List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3" data-testid="task-list">
            {tasks.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center">
                <p className="text-white/30 text-sm">No tasks found</p>
              </div>
            ) : (
              tasks.map((task) => (
                <SortableTask key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
