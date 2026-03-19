const router = require('express').Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const BlogPost = require('../models/BlogPost');
const User = require('../models/User');

// ==================== BLOG POSTS ENDPOINTS ====================

// GET all blog posts (Super Admin only)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const posts = await BlogPost.find()
      .sort({ createdAt: -1 })
      .populate('createdBy.userId', 'name email')
      .populate('lastModifiedBy.userId', 'name email');

    res.json(posts);
  } catch (error) {
    console.error('Error obteniendo blog posts:', error);
    res.status(500).json({ error: 'Error al obtener los artículos del blog' });
  }
});

// GET published blog posts (público)
router.get('/published', async (req, res) => {
  try {
    const posts = await BlogPost.find({ published: true })
      .sort({ publishedAt: -1 })
      .select('-createdBy -lastModifiedBy');

    res.json(posts);
  } catch (error) {
    console.error('Error obteniendo blog posts publicados:', error);
    res.status(500).json({ error: 'Error al obtener los artículos publicados' });
  }
});

// GET single blog post by slug (público si está publicado)
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await BlogPost.findOne({ slug });

    if (!post) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    // Si el post no está publicado, solo Super Admin puede verlo
    if (!post.published) {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(403).json({ error: 'Este artículo no está disponible públicamente' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.role !== 'superadmin') {
          return res.status(403).json({ error: 'Este artículo no está disponible públicamente' });
        }
      } catch (err) {
        return res.status(403).json({ error: 'Este artículo no está disponible públicamente' });
      }
    }

    // Incrementar contador de vistas solo si está publicado
    if (post.published) {
      post.views += 1;
      await post.save();
    }

    res.json(post);
  } catch (error) {
    console.error('Error obteniendo blog post:', error);
    res.status(500).json({ error: 'Error al obtener el artículo' });
  }
});

// POST - Crear nuevo blog post (solo Super Admin)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const { title, slug, excerpt, content, author, category, image, keywords, readTime } = req.body;

    if (!title || !slug || !excerpt || !content || !category) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        required: ['title', 'slug', 'excerpt', 'content', 'category']
      });
    }

    const existingPost = await BlogPost.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({ error: 'Ya existe un artículo con este slug' });
    }

    const newPost = new BlogPost({
      title,
      slug,
      excerpt,
      content,
      author: author || 'Equipo Tribus',
      category,
      image: image || '📝',
      keywords: keywords || [],
      readTime: readTime || '5 min',
      createdBy: {
        userId: user._id,
        userName: user.name
      }
    });

    await newPost.save();

    res.status(201).json({
      message: 'Artículo creado exitosamente',
      post: newPost
    });
  } catch (error) {
    console.error('Error creando blog post:', error);
    res.status(500).json({ error: 'Error al crear el artículo' });
  }
});

// PUT - Actualizar blog post (solo Super Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const { id } = req.params;
    const { title, slug, excerpt, content, author, category, image, keywords, readTime } = req.body;

    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    if (slug && slug !== post.slug) {
      const existingPost = await BlogPost.findOne({ slug });
      if (existingPost) {
        return res.status(400).json({ error: 'Ya existe un artículo con este slug' });
      }
    }

    if (title) post.title = title;
    if (slug) post.slug = slug;
    if (excerpt) post.excerpt = excerpt;
    if (content) post.content = content;
    if (author) post.author = author;
    if (category) post.category = category;
    if (image !== undefined) post.image = image;
    if (keywords) post.keywords = keywords;
    if (readTime) post.readTime = readTime;

    post.lastModifiedBy = {
      userId: user._id,
      userName: user.name,
      modifiedAt: new Date()
    };

    await post.save();

    res.json({ message: 'Artículo actualizado exitosamente', post });
  } catch (error) {
    console.error('Error actualizando blog post:', error);
    res.status(500).json({ error: 'Error al actualizar el artículo' });
  }
});

// DELETE - Eliminar blog post (solo Super Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const { id } = req.params;
    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    await BlogPost.findByIdAndDelete(id);

    res.json({
      message: 'Artículo eliminado exitosamente',
      deletedPost: { id: post._id, title: post.title, slug: post.slug }
    });
  } catch (error) {
    console.error('Error eliminando blog post:', error);
    res.status(500).json({ error: 'Error al eliminar el artículo' });
  }
});

// PATCH - Publicar/Despublicar blog post (solo Super Admin)
router.patch('/:id/publish', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const { id } = req.params;
    const { published } = req.body;

    if (typeof published !== 'boolean') {
      return res.status(400).json({ error: 'El campo "published" debe ser booleano' });
    }

    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    post.published = published;
    if (published && !post.publishedAt) {
      post.publishedAt = new Date();
    }

    post.lastModifiedBy = {
      userId: user._id,
      userName: user.name,
      modifiedAt: new Date()
    };

    await post.save();

    res.json({
      message: `Artículo ${published ? 'publicado' : 'despublicado'} exitosamente`,
      post
    });
  } catch (error) {
    console.error('Error cambiando estado de publicación:', error);
    res.status(500).json({ error: 'Error al cambiar el estado de publicación' });
  }
});

module.exports = router;
