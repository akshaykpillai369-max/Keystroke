const express = require('express');
const router = express.Router();
const db = require('../lib/db.cjs');

const CATEGORY_KEYWORDS = {
  'Work': ['work', 'office', 'meeting', 'client', 'deadline', 'project', 'report', 'email', 'business'],
  'Personal': ['personal', 'home', 'family', 'hobby', 'reading', 'exercise', 'meditate', 'groceries'],
  'Side Project': ['side', 'project', 'github', 'app', 'feature', 'blog', 'portfolio'],
  'Health': ['health', 'workout', 'gym', 'run', 'yoga', 'doctor', 'sleep', 'water', 'diet', 'meditation']
};

function inferCategory(title) {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return 'Uncategorized';
}

const emit = (req, event, data) => {
  try { req.app.get('io').emit(event, data); } catch {}
};

router.post('/tasks', async (req, res) => {
  try {
    const data = req.body;
    if (!data.category || data.category === 'Auto') {
      data.category = inferCategory(data.title);
    }
    const task = await db.Task.create(data);
    if (task.project) {
      await db.Project.findByIdAndUpdate(task.project, { $push: { tasks: task._id } });
    }
    emit(req, 'task:created', task);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const task = await db.Task.findByIdAndUpdate(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    emit(req, 'task:updated', task);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await db.Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.project) {
      await db.Project.findByIdAndUpdate(task.project, { $pull: { tasks: task._id } });
    }
    emit(req, 'task:deleted', { id: req.params.id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/tasks/:id/log-time', async (req, res) => {
  try {
    const { secondsLogged } = req.body;
    const task = await db.Task.findByIdAndUpdate(req.params.id, { $inc: { durationLogged: secondsLogged } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    emit(req, 'task:time-logged', { id: task._id, durationLogged: task.durationLogged });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const project = await db.Project.create(req.body);
    emit(req, 'project:created', project);
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const project = await db.Project.findByIdAndUpdate(req.params.id, req.body);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    emit(req, 'project:updated', project);
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const project = await db.Project.findByIdAndUpdate(req.params.id, { status });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    emit(req, 'project:updated', project);
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/projects/:id/tasks', async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await db.Task.findByIdAndUpdate(taskId, { project: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await db.Project.findByIdAndUpdate(req.params.id, { $push: { tasks: task._id } });
    emit(req, 'task:updated', task);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/ai/insights', async (req, res) => {
  try {
    const insights = await db.Insight.find({ isResolved: false }, { createdAt: -1, limit: 5 });
    res.json(insights);
  } catch (err) {
    res.json([]);
  }
});

router.post('/ai/insights', async (req, res) => {
  try {
    const insight = await db.Insight.create(req.body);
    emit(req, 'insight:new', insight);
    res.status(201).json(insight);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/ai/insights/:id/resolve', async (req, res) => {
  try {
    const insight = await db.Insight.findByIdAndUpdate(req.params.id, { isResolved: true });
    if (!insight) return res.status(404).json({ error: 'Insight not found' });
    res.json(insight);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
