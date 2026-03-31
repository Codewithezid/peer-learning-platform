'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Lightbulb, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { SKILL_CATEGORIES } from '@/lib/utils';
import { unwrapData } from '@/lib/apiResponse';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface SkillCatalog {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

interface UserSkill {
  id: string;
  skill_id: string;
  proficiency_level: number;
  is_teaching: boolean;
  is_learning: boolean;
  skills?: SkillCatalog;
}

export default function SkillsPage() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<SkillCatalog[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState(3);
  const [isTeaching, setIsTeaching] = useState(false);
  const [isLearning, setIsLearning] = useState(true);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('programming');

  const assignedSkillIds = useMemo(() => new Set(userSkills.map((s) => s.skill_id)), [userSkills]);

  const unassignedCatalog = useMemo(
    () => catalog.filter((skill) => !assignedSkillIds.has(skill.id)),
    [catalog, assignedSkillIds]
  );

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [catalogRes, userSkillsRes] = await Promise.all([
        api.get('/skills'),
        api.get(`/user-skills/user/${user.id}`),
      ]);

      setCatalog(unwrapData<SkillCatalog[]>(catalogRes) || []);
      setUserSkills(unwrapData<UserSkill[]>(userSkillsRes) || []);
      setSelectedSkillId((prev) => prev || (unwrapData<SkillCatalog[]>(catalogRes)?.[0]?.id ?? ''));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCreateCatalogSkill = async () => {
    if (!newSkillName.trim()) {
      toast.error('Skill name is required');
      return;
    }
    try {
      setSaving(true);
      await api.post('/skills', {
        name: newSkillName.trim(),
        category: newSkillCategory,
      });
      setNewSkillName('');
      await loadData();
      toast.success('Skill added to catalog');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create skill');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSkill = async () => {
    if (!selectedSkillId) {
      toast.error('Select a skill first');
      return;
    }
    try {
      setSaving(true);
      await api.post('/user-skills', {
        skill_id: selectedSkillId,
        proficiency_level: proficiency,
        is_teaching: isTeaching,
        is_learning: isLearning,
      });
      await loadData();
      toast.success('Skill assigned successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to assign skill');
    } finally {
      setSaving(false);
    }
  };

  const updateUserSkill = async (id: string, updates: Partial<UserSkill>) => {
    try {
      await api.put(`/user-skills/${id}`, updates);
      setUserSkills((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } as UserSkill : item))
      );
      toast.success('Skill updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update skill');
    }
  };

  const removeUserSkill = async (id: string) => {
    try {
      await api.delete(`/user-skills/${id}`);
      setUserSkills((prev) => prev.filter((item) => item.id !== id));
      toast.success('Skill removed');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove skill');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" variant="rect" />
        <Skeleton className="h-64" variant="rect" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-900">Skills Workspace</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Build your skill profile, define what you can teach, and mark what you want to learn.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Assign Existing Skill</h2>
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Skill</label>
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select skill</option>
              {unassignedCatalog.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} ({skill.category})
                </option>
              ))}
            </select>

            <label className="text-sm font-medium text-slate-700">Proficiency: {proficiency}/5</label>
            <input
              type="range"
              min={1}
              max={5}
              value={proficiency}
              onChange={(e) => setProficiency(Number(e.target.value))}
              className="w-full"
            />

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isTeaching}
                  onChange={(e) => setIsTeaching(e.target.checked)}
                />
                I can teach this
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isLearning}
                  onChange={(e) => setIsLearning(e.target.checked)}
                />
                I am learning this
              </label>
            </div>
          </div>

          <Button
            onClick={handleAssignSkill}
            loading={saving}
            disabled={!selectedSkillId || unassignedCatalog.length === 0}
          >
            Assign Skill
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Create New Catalog Skill</h2>
          <Input
            label="Skill name"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="e.g. Prompt Engineering"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              {SKILL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleCreateCatalogSkill} loading={saving}>
            Add Skill to Catalog
          </Button>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">My Skills</h2>
        {userSkills.length === 0 ? (
          <EmptyState
            icon={<Lightbulb className="h-8 w-8" />}
            title="No skills yet"
            description="Assign your first skill to unlock recommendations and analytics."
          />
        ) : (
          <div className="space-y-4">
            {userSkills.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.skills?.name || 'Unnamed skill'}</p>
                    <p className="text-xs text-slate-500">{item.skills?.category}</p>
                    <div className="mt-2 flex gap-2">
                      {item.is_teaching && <Badge variant="success">Teaching</Badge>}
                      {item.is_learning && <Badge variant="primary">Learning</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => removeUserSkill(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Proficiency</label>
                    <select
                      value={item.proficiency_level}
                      onChange={(e) =>
                        updateUserSkill(item.id, { proficiency_level: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}/5
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700 mt-5">
                    <input
                      type="checkbox"
                      checked={item.is_teaching}
                      onChange={(e) => updateUserSkill(item.id, { is_teaching: e.target.checked })}
                    />
                    Teaching
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700 mt-5">
                    <input
                      type="checkbox"
                      checked={item.is_learning}
                      onChange={(e) => updateUserSkill(item.id, { is_learning: e.target.checked })}
                    />
                    Learning
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
