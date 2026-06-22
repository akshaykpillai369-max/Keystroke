const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function randomId() {
  return crypto.randomUUID();
}

class JsonCollection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.cache = null;
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.cache = JSON.parse(raw);
      } else {
        this.cache = [];
        this._save();
      }
    } catch {
      this.cache = [];
      this._save();
    }
  }

  _save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8');
  }

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  find(query = {}) {
    let results = this._clone(this.cache);
    for (const [key, val] of Object.entries(query)) {
      if (key === '$or' && Array.isArray(val)) {
        results = results.filter(item =>
          val.some(cond => Object.entries(cond).every(([k, v]) => item[k] === v))
        );
        continue;
      }
      if (key === '$ne') continue;
      results = results.filter(item => {
        if (typeof val === 'object' && val !== null && val.$ne !== undefined) {
          return item[key] !== val.$ne;
        }
        return item[key] === val;
      });
    }
    return results;
  }

  findById(id) {
    const item = this.cache.find(d => d._id === id);
    return item ? this._clone(item) : null;
  }

  create(data) {
    const doc = {
      _id: randomId(),
      title: data.title || '',
      description: data.description || '',
      status: data.status || 'Todo',
      priority: data.priority || 'Medium',
      category: data.category || 'Uncategorized',
      project: data.project || null,
      durationLogged: data.durationLogged || 0,
      dueDate: data.dueDate || new Date(Date.now() + 24*60*60*1000).toISOString(),
      aiOptimizedOrder: data.aiOptimizedOrder || 0,
      name: data.name || '',
      tasks: data.tasks || [],
      aiHealthMetrics: data.aiHealthMetrics || { velocity: 100, blockersDetected: false },
      createdAt: new Date().toISOString(),
      ...data
    };
    // Don't override _id if provided
    if (data._id) doc._id = data._id;
    this.cache.push(doc);
    this._save();
    return this._clone(doc);
  }

  findByIdAndUpdate(id, updates, options = {}) {
    const idx = this.cache.findIndex(d => d._id === id);
    if (idx === -1) return null;
    const doc = this.cache[idx];
    for (const [key, val] of Object.entries(updates)) {
      if (key === '$push') {
        for (const [pk, pv] of Object.entries(val)) {
          if (!doc[pk]) doc[pk] = [];
          doc[pk].push(pv);
        }
      } else if (key === '$pull') {
        for (const [pk, pv] of Object.entries(val)) {
          if (doc[pk]) {
            doc[pk] = doc[pk].filter(id => id !== pv && id !== String(pv));
            if (typeof pv === 'object') {
              doc[pk] = doc[pk].filter(item => JSON.stringify(item) !== JSON.stringify(pv));
            }
          }
        }
      } else if (key === '$inc') {
        for (const [ik, iv] of Object.entries(val)) {
          doc[ik] = (doc[ik] || 0) + iv;
        }
      } else {
        doc[key] = val;
      }
    }
    this.cache[idx] = doc;
    this._save();
    return this._clone(doc);
  }

  findByIdAndDelete(id) {
    const idx = this.cache.findIndex(d => d._id === id);
    if (idx === -1) return null;
    const doc = this.cache[idx];
    this.cache.splice(idx, 1);
    this._save();
    return this._clone(doc);
  }

  sort(field, dir = -1) {
    this.cache.sort((a, b) => {
      const va = a[field] || 0;
      const vb = b[field] || 0;
      return dir === -1 ? (va < vb ? 1 : -1) : (va > vb ? 1 : -1);
    });
    return this;
  }

  limit(n) {
    this.cache = this.cache.slice(0, n);
    return this;
  }

  countDocuments(query = {}) {
    return this.find(query).length;
  }

  populate() {
    // no-op, returns self
    return this;
  }

  insertMany(dataArray) {
    const docs = dataArray.map(d => this.create(d));
    return docs;
  }

  getAll() {
    return this._clone(this.cache);
  }
}

// Collections
const collections = {
  tasks: new JsonCollection('tasks'),
  projects: new JsonCollection('projects'),
  insights: new JsonCollection('insights'),
};

module.exports = collections;
