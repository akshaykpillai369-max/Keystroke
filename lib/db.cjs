const mongoose = require('mongoose');
const jsonDb = require('./jsonDb.cjs');

let useMongo = false;

function init(mongoUri) {
  useMongo = mongoose.connection.readyState === 1;
  return useMongo;
}

// Task operations
const Task = {
  async find(query = {}, sortOpt = {}) {
    if (useMongo) {
      const Model = require('../models/Task.cjs');
      const q = Model.find(query);
      if (sortOpt.createdAt === -1) q.sort({ createdAt: -1 });
      return q;
    }
    let results = jsonDb.tasks.find(query);
    if (sortOpt.createdAt === -1) {
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return results;
  },
  async findById(id) {
    if (useMongo) {
      const Model = require('../models/Task.cjs');
      return Model.findById(id);
    }
    return jsonDb.tasks.findById(id);
  },
  async findByIdAndUpdate(id, updates, opts = {}) {
    if (useMongo) {
      const Model = require('../models/Task.cjs');
      return Model.findByIdAndUpdate(id, updates, { new: true, ...opts });
    }
    return jsonDb.tasks.findByIdAndUpdate(id, updates);
  },
  async findByIdAndDelete(id) {
    if (useMongo) {
      const Model = require('../models/Task.cjs');
      return Model.findByIdAndDelete(id);
    }
    return jsonDb.tasks.findByIdAndDelete(id);
  },
  async create(data) {
    if (useMongo) {
      const Model = require('../models/Task.cjs');
      return Model.create(data);
    }
    return jsonDb.tasks.create(data);
  },
};

// Project operations
const Project = {
  async find(query = {}, sortOpt = {}) {
    if (useMongo) {
      const Model = require('../models/Project.cjs');
      const q = Model.find(query);
      if (sortOpt.createdAt === -1) q.sort({ createdAt: -1 });
      return q;
    }
    let results = jsonDb.projects.find(query);
    if (sortOpt.createdAt === -1) {
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return results;
  },
  async findById(id) {
    if (useMongo) {
      const Model = require('../models/Project.cjs');
      return Model.findById(id).populate('tasks');
    }
    const proj = jsonDb.projects.findById(id);
    if (proj && proj.tasks && proj.tasks.length) {
      proj.tasks = proj.tasks.map(tid => jsonDb.tasks.findById(tid)).filter(Boolean);
    } else if (proj) {
      proj.tasks = [];
    }
    // populate tasks from jsonDb
    return proj;
  },
  async findByIdAndUpdate(id, updates, opts = {}) {
    if (useMongo) {
      const Model = require('../models/Project.cjs');
      return Model.findByIdAndUpdate(id, updates, { new: true, ...opts });
    }
    return jsonDb.projects.findByIdAndUpdate(id, updates);
  },
  async create(data) {
    if (useMongo) {
      const Model = require('../models/Project.cjs');
      return Model.create(data);
    }
    return jsonDb.projects.create(data);
  },
};

// Insight operations
const Insight = {
  async find(query = {}, sortOpt = {}) {
    if (useMongo) {
      const Model = require('../models/Insight.cjs');
      const q = Model.find(query);
      if (sortOpt.createdAt === -1) q.sort({ createdAt: -1 });
      return q;
    }
    let results = jsonDb.insights.find(query);
    if (sortOpt.createdAt === -1) {
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sortOpt.limit) {
      results = results.slice(0, sortOpt.limit);
    }
    return results;
  },
  async create(data) {
    if (useMongo) {
      const Model = require('../models/Insight.cjs');
      return Model.create(data);
    }
    return jsonDb.insights.create(data);
  },
  async findByIdAndUpdate(id, updates, opts = {}) {
    if (useMongo) {
      const Model = require('../models/Insight.cjs');
      return Model.findByIdAndUpdate(id, updates, { new: true, ...opts });
    }
    return jsonDb.insights.findByIdAndUpdate(id, updates);
  },
};

module.exports = { init, Task, Project, Insight, jsonDb };
