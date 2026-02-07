import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, GripVertical, Tags } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Folder } from "@/components/ui/folder";
import { Link } from "react-router-dom";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

const colorOptions = [
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#6366F1", // indigo
];

function SortableCategoryItem({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <button
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
        <Link to={`/files?category_id=${category.id}`} className="flex items-center gap-3">
          <Folder color={category.color} size={0.9} />
          <span className="font-medium">{category.name}</span>
        </Link>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" onClick={() => onEdit(category)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(category.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "#3B82F6" });
  const { user } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    if (!user) return;

    try {
      const response = await api.categories.list();
      setCategories(response.data || []);
    } catch (error) {
      toast.error("Gagal mengambil kategori");
    }
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    // Update sort_order in database
    const updates = newCategories.map((cat, index) => ({
      id: cat.id,
      sort_order: index,
    }));

    try {
      await Promise.all(updates.map(update => 
        // Need to add update endpoint to client api
        // I'll assume I can use a generic update or add it to client.ts
        // Wait, client.ts only has list for categories. I need to add update/create/delete to client.ts first?
        // Ah, I missed adding update/create/delete to client.ts categories section.
        // I will add them to client.ts later. For now I will write the code here assuming it exists.
        api.categories.update(update.id, { sort_order: update.sort_order })
      ));
      toast.success("Urutan kategori diperbarui");
    } catch (error) {
      console.error("Failed to update sort order", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }

    if (editingCategory) {
      try {
        await api.categories.update(editingCategory.id, { name: formData.name, color: formData.color });
        toast.success("Kategori diperbarui");
        fetchCategories();
      } catch (error) {
        toast.error("Gagal memperbarui kategori");
      }
    } else {
      try {
        await api.categories.create({
            // user_id handled by backend
            name: formData.name,
            color: formData.color,
            sort_order: categories.length,
        });
        toast.success("Kategori dibuat");
        fetchCategories();
      } catch (error) {
        toast.error("Gagal membuat kategori");
      }
    }

    resetForm();
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.categories.delete(id);
      toast.success("Kategori dihapus");
      fetchCategories();
    } catch (error) {
      toast.error("Gagal menghapus kategori");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", color: "#3B82F6" });
    setEditingCategory(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, color: category.color });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kategori</h1>
          <p className="text-muted-foreground">Kelola berkas dengan kategori kustom</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="aurora-gradient">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Kategori" : "Buat Kategori Baru"}</DialogTitle>
                <DialogDescription>
                  {editingCategory 
                    ? "Ubah detail kategori yang sudah ada" 
                    : "Tambahkan kategori baru untuk mengelompokkan berkas Anda"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Kategori</Label>
                <Input
                  id="name"
                  placeholder="Dokumen, Gambar, Video..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass"
                />
              </div>
              <div className="space-y-2">
                <Label>Warna</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Batal</Button>
              <Button onClick={handleSubmit} className="aurora-gradient">
                {editingCategory ? "Perbarui" : "Buat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Memuat kategori...</p>
        </div>
      ) : categories.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tags className="h-16 w-16 text-muted-foreground/50" />
            <p className="mt-4 text-xl font-medium">Belum ada kategori</p>
            <p className="text-muted-foreground">Buat kategori untuk mengorganisir berkas Anda</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Seret dan lepas untuk mengubah urutan kategori
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {categories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      onEdit={openEditDialog}
                      onDelete={deleteCategory}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
