import { useEffect, useState, useCallback } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, ExternalLink, Trash2, Tag } from 'lucide-react';
import api from '../lib/api';

const ResourceCard = ({ resource, onDelete }) => {
  const typeColors = {
    article: '#ffb900',
    video: '#ff6b00',
    pdf: '#39ff14',
    course: '#00f3ff',
  };
  const color = typeColors[resource.resource_type] || '#ffffff';

  return (
    <div className="glass-card rounded-3xl p-5 group hover:scale-[1.01] transition-all" data-testid={`resource-${resource.id}`}>
      <div className="flex items-start justify-between mb-3">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider border" style={{ borderColor: `${color}40`, color, background: `${color}10` }}>
          {resource.resource_type}
        </Badge>
        <div className="flex gap-1">
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#00f3ff] transition-colors" data-testid={`resource-link-${resource.id}`}>
            <ExternalLink size={14} />
          </a>
          <button onClick={() => onDelete(resource.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all" data-testid={`resource-delete-${resource.id}`}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{resource.title}</h3>
      <p className="text-[10px] text-white/20 truncate mb-3">{resource.url}</p>
      {resource.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {resource.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 flex items-center gap-0.5">
              <Tag size={8} /> {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const LibraryModule = () => {
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [resourceType, setResourceType] = useState('article');
  const [tags, setTags] = useState('');

  const fetchResources = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { resource_type: filter } : {};
      const res = await api.get('/resources', { params });
      setResources(res.data);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    }
  }, [filter]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    await api.post('/resources', { title, url, resource_type: resourceType, tags: tagList });
    setTitle(''); setUrl(''); setTags('');
    fetchResources();
  };

  const handleDelete = async (id) => {
    await api.delete(`/resources/${id}`);
    fetchResources();
  };

  return (
    <div className="relative z-10 p-4 md:p-8 pb-32 max-w-4xl mx-auto" data-testid="library-view">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Learning Library</h1>
        <p className="text-white/40 text-sm mt-1">Curate your learning resources</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'article', 'video', 'pdf', 'course'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            data-testid={`resource-filter-${f}`}
            className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all ${
              filter === f ? 'bg-[#ffb900]/15 text-[#ffb900] border border-[#ffb900]/30' : 'text-white/40 hover:text-white/60 border border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 stagger-in" data-testid="resource-list">
        {resources.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center col-span-2">
            <p className="text-white/30 text-sm">No resources found</p>
          </div>
        ) : (
          resources.map((r) => <ResourceCard key={r.id} resource={r} onDelete={handleDelete} />)
        )}
      </div>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="glass-panel rounded-3xl p-6 space-y-3" data-testid="add-resource-form">
        <p className="text-sm font-semibold text-white mb-2 tracking-wide uppercase">Add New Resource</p>
        <Input data-testid="resource-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20" required />
        <Input data-testid="resource-url-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Resource URL" className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20" required />
        <div className="grid grid-cols-2 gap-3">
          <Select value={resourceType} onValueChange={setResourceType}>
            <SelectTrigger className="bg-black/30 border-white/10 rounded-xl text-white" data-testid="resource-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0B1221] border-white/10">
              {['article', 'video', 'pdf', 'course'].map((t) => (
                <SelectItem key={t} value={t} className="text-white hover:bg-white/10 capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input data-testid="resource-tags-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" className="bg-black/30 border-white/10 rounded-xl text-white placeholder:text-white/20" />
        </div>
        <Button type="submit" data-testid="add-resource-btn" className="w-full rounded-full bg-[#ffb900] text-black font-bold hover:shadow-[0_0_20px_rgba(255,185,0,0.4)] transition-all">
          <Plus size={16} className="mr-1" /> Add Resource
        </Button>
      </form>
    </div>
  );
};
