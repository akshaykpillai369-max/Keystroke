const express = require('express');
const router = express.Router();
const db = require('../lib/db.cjs');

router.get('/', async (req, res) => {
  try {
    const tasks = await db.Task.find({}, { createdAt: -1 });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const todoTasks = tasks.filter(t => t.status === 'Todo').length;
    const totalFocusTime = tasks.reduce((sum, t) => sum + (t.durationLogged || 0), 0);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const todo = tasks.filter(t => t.status === 'Todo');
    const inProgress = tasks.filter(t => t.status === 'In Progress');
    const completed = tasks.filter(t => t.status === 'Completed');
    const insights = await db.Insight.find({ isResolved: false }, { createdAt: -1, limit: 3 });

    const renderData = {
      activePage: 'daily',
      stats: { totalTasks, completedTasks, inProgressTasks, todoTasks, totalFocusTime, completionRate },
      columns: { todo, inProgress, completed },
      insights
    };
    res.render('daily', renderData);
  } catch (err) {
    res.render('daily', {
      activePage: 'daily',
      stats: { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, todoTasks: 0, totalFocusTime: 0, completionRate: 0 },
      columns: { todo: [], inProgress: [], completed: [] },
      insights: []
    });
  }
});

// Alias: /daily maps to the same view as /
router.get('/daily', async (req, res) => res.redirect('/'));

router.get('/categories', async (req, res) => {
  try {
    const tasks = await db.Task.find({}, { createdAt: -1 });
    const cats = ['Work', 'Personal', 'Side Project', 'Health', 'Uncategorized'];
    const categories = {};
    cats.forEach(c => { categories[c] = tasks.filter(t => t.category === c); });
    res.render('categories', { activePage: 'categories', categories, categoryNames: cats });
  } catch (err) {
    const cats = ['Work', 'Personal', 'Side Project', 'Health', 'Uncategorized'];
    const empty = {}; cats.forEach(c => empty[c] = []);
    res.render('categories', { activePage: 'categories', categories: empty, categoryNames: cats });
  }
});

router.get('/project/:id', async (req, res) => {
  try {
    const project = await db.Project.findById(req.params.id);
    if (!project) return res.redirect('/projects');
    // Populate full task objects from the task IDs stored in project.tasks
    const taskIds = (project.tasks || []).map(t => (t._id || t).toString());
    const allTaskObjects = await db.Task.find({}, { createdAt: -1 });
    const tasks = allTaskObjects.filter(t => taskIds.includes(t._id.toString()));
    const availableTasks = allTaskObjects.filter(t =>
      !taskIds.includes(t._id.toString()) && t.status !== 'Completed'
    );
    res.render('project', { activePage: 'projects', project, tasks, availableTasks });
  } catch (err) {
    res.redirect('/projects');
  }
});

router.get('/projects', async (req, res) => {
  try {
    const projects = await db.Project.find({}, { createdAt: -1 });
    const allTasks = await db.Task.find({}, { createdAt: -1 });
    res.render('projects', { activePage: 'projects', projects, allTasks });
  } catch (err) {
    res.render('projects', { activePage: 'projects', projects: [], allTasks: [] });
  }
});

router.get('/timer', async (req, res) => {
  try {
    const tasks = (await db.Task.find({}, { createdAt: -1 })).filter(t => t.status !== 'Completed');
    res.render('timer', { activePage: 'timer', tasks });
  } catch (err) {
    res.render('timer', { activePage: 'timer', tasks: [] });
  }
});

router.get('/notes', async (req, res) => {
  res.render('notes', { activePage: 'notes' });
});

module.exports = router;

