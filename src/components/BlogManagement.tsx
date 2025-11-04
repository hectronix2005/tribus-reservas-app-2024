import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2, Eye, EyeOff, FileText, AlertCircle, Check } from 'lucide-react';
import { blogService } from '../services/api';
import { BlogPost } from '../types';

export function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await blogService.getAll();
      setPosts(data);
    } catch (error) {
      console.error('Error cargando posts:', error);
      setMessage({ type: 'error', text: 'Error al cargar los artículos del blog' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingPost({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      author: 'Equipo Tribus',
      category: 'Coworking',
      image: '📝',
      keywords: [],
      readTime: '5 min',
      published: false
    });
    setIsCreating(true);
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!editingPost) return;

    // Validar campos requeridos
    if (!editingPost.title || !editingPost.slug || !editingPost.excerpt ||
        !editingPost.content || !editingPost.category) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos obligatorios' });
      return;
    }

    try {
      setSaving(true);

      if (isCreating) {
        // Crear nuevo post
        await blogService.create({
          title: editingPost.title,
          slug: editingPost.slug,
          excerpt: editingPost.excerpt,
          content: editingPost.content,
          author: editingPost.author || 'Equipo Tribus',
          category: editingPost.category as any,
          image: editingPost.image || '📝',
          keywords: editingPost.keywords || [],
          readTime: editingPost.readTime || '5 min'
        });
        setMessage({ type: 'success', text: 'Artículo creado exitosamente' });
      } else {
        // Actualizar post existente
        await blogService.update(editingPost._id!, {
          title: editingPost.title,
          slug: editingPost.slug,
          excerpt: editingPost.excerpt,
          content: editingPost.content,
          author: editingPost.author,
          category: editingPost.category as any,
          image: editingPost.image,
          keywords: editingPost.keywords,
          readTime: editingPost.readTime
        });
        setMessage({ type: 'success', text: 'Artículo actualizado exitosamente' });
      }

      // Recargar posts y cerrar editor
      await loadPosts();
      setEditingPost(null);
      setIsCreating(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error guardando post:', error);
      setMessage({ type: 'error', text: error.message || 'Error al guardar el artículo' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      setSaving(true);
      await blogService.togglePublish(post._id, !post.published);
      setMessage({
        type: 'success',
        text: `Artículo ${!post.published ? 'publicado' : 'despublicado'} exitosamente`
      });
      await loadPosts();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error cambiando estado de publicación:', error);
      setMessage({ type: 'error', text: 'Error al cambiar el estado de publicación' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este artículo? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setSaving(true);
      await blogService.delete(postId);
      setMessage({ type: 'success', text: 'Artículo eliminado exitosamente' });
      await loadPosts();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error eliminando post:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el artículo' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    if (!editingPost) return;

    setEditingPost({
      ...editingPost,
      [field]: value
    });

    // Auto-generar slug a partir del título
    if (field === 'title' && isCreating) {
      const slug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
        .replace(/\s+/g, '-') // Espacios a guiones
        .replace(/-+/g, '-') // Múltiples guiones a uno solo
        .trim();

      setEditingPost({
        ...editingPost,
        title: value,
        slug
      });
    }
  };

  const updateKeywords = (keywordsStr: string) => {
    const keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k.length > 0);
    updateField('keywords', keywords);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando artículos...</div>
      </div>
    );
  }

  // Si está editando o creando, mostrar el editor
  if (editingPost) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {isCreating ? 'Crear Nuevo Artículo' : 'Editar Artículo'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={editingPost.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Título del artículo"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug (URL) *
              </label>
              <input
                type="text"
                value={editingPost.slug || ''}
                onChange={(e) => updateField('slug', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="titulo-del-articulo"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL: /blog/{editingPost.slug || 'titulo-del-articulo'}
              </p>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extracto (máx 300 caracteres) *
              </label>
              <textarea
                value={editingPost.excerpt || ''}
                onChange={(e) => updateField('excerpt', e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Breve resumen del artículo..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {(editingPost.excerpt || '').length}/300 caracteres
              </p>
            </div>

            {/* Contenido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenido (Markdown) *
              </label>
              <textarea
                value={editingPost.content || ''}
                onChange={(e) => updateField('content', e.target.value)}
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Escribe el contenido del artículo en formato Markdown..."
              />
            </div>

            {/* Fila de campos pequeños */}
            <div className="grid grid-cols-2 gap-4">
              {/* Autor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Autor
                </label>
                <input
                  type="text"
                  value={editingPost.author || ''}
                  onChange={(e) => updateField('author', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Equipo Tribus"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  value={editingPost.category || 'Coworking'}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Networking">Networking</option>
                  <option value="Ahorro">Ahorro</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Productividad">Productividad</option>
                  <option value="Emprendimiento">Emprendimiento</option>
                  <option value="Coworking">Coworking</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Imagen (emoji) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen (emoji)
                </label>
                <input
                  type="text"
                  value={editingPost.image || ''}
                  onChange={(e) => updateField('image', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="📝"
                />
              </div>

              {/* Tiempo de lectura */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiempo de lectura
                </label>
                <input
                  type="text"
                  value={editingPost.readTime || ''}
                  onChange={(e) => updateField('readTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="5 min"
                />
              </div>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Palabras clave (separadas por comas)
              </label>
              <input
                type="text"
                value={editingPost.keywords?.join(', ') || ''}
                onChange={(e) => updateKeywords(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="coworking, oficina compartida, networking"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista de lista
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} />
            Gestión de Blog
          </h2>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Nuevo Artículo
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No hay artículos aún. Crea tu primer artículo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{post.image}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{post.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {post.category}
                          </span>
                          <span>•</span>
                          <span>{post.readTime}</span>
                          <span>•</span>
                          <span>{post.views} vistas</span>
                          <span>•</span>
                          <span className={`px-2 py-1 rounded ${
                            post.published
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {post.published ? 'Publicado' : 'Borrador'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{post.excerpt}</p>
                    <p className="text-xs text-gray-400">
                      Creado: {new Date(post.createdAt).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => setEditingPost(post)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      disabled={saving}
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleTogglePublish(post)}
                      className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                        post.published
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      disabled={saving}
                    >
                      {post.published ? <EyeOff size={16} /> : <Eye size={16} />}
                      {post.published ? 'Ocultar' : 'Publicar'}
                    </button>
                    <button
                      onClick={() => handleDelete(post._id)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      disabled={saving}
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
