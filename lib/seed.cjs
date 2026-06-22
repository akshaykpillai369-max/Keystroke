const db = require('./db.cjs');

async function seed() {
  const existingTasks = await db.Task.find({});
  const existingProjects = await db.Project.find({});
  if (existingTasks.length || existingProjects.length) return;

  const taskSpecs = [
    ['Finalize Q4 Strategic Proposal', 'Complete the financial projections and executive summary for Friday board review.', 'Todo', 'Urgent', 'Work', 0, 1],
    ['Review AI Model Training Logs', 'Identify anomalies and write a short model health note.', 'Todo', 'High', 'Work', 0, 2],
    ['Approve Marketing Budgets', 'Confirm campaign allocation and unblock next week launch assets.', 'In Progress', 'Medium', 'Work', 2700, 3],
    ['Morning Standup Meeting', 'Sync with engineering on the migration plan.', 'Completed', 'Medium', 'Work', 1800, 4],
    ['Personal Training Session', 'Optimized for your low-energy dip at 4 PM.', 'Todo', 'Medium', 'Health', 0, 5],
    ['Draft Weekly Newsletter', 'Send out community highlights for August.', 'Completed', 'Low', 'Side Project', 2400, 6],
    ['Vendor Research', 'Compare three vendor options and capture procurement notes.', 'Todo', 'Medium', 'Work', 0, 7],
    ['Hydration Reset', 'Refill bottle and take a five-minute stretch break.', 'Todo', 'Low', 'Health', 0, 8],
    ['Family Dinner Plan', 'Pick groceries and confirm timing.', 'Todo', 'Low', 'Personal', 0, 9]
  ];

  const tasks = [];
  for (const [title, description, status, priority, category, durationLogged, aiOptimizedOrder] of taskSpecs) {
    tasks.push(await db.Task.create({ title, description, status, priority, category, durationLogged, aiOptimizedOrder }));
  }

  const roadmapTasks = tasks.slice(0, 5);
  const project = await db.Project.create({
    name: 'Product Launch Roadmap',
    description: 'Coordinate the final cross-departmental alignment for the upcoming Q3 platform expansion.',
    status: 'Active',
    tasks: roadmapTasks.map(task => task._id),
    aiHealthMetrics: {
      velocity: 88,
      blockersDetected: false,
      projectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  for (const task of roadmapTasks) {
    await db.Task.findByIdAndUpdate(task._id, { project: project._id });
  }

  await db.Project.create({
    name: 'Infrastructure Audit',
    description: 'Review API gateway response times and server latency bottlenecks.',
    status: 'Active',
    tasks: [],
    aiHealthMetrics: { velocity: 73, blockersDetected: true }
  });

  await db.Insight.create({
    type: 'Focus Match',
    message: "Your focus historically peaks between 9:00 AM and 11:30 AM. I've prioritized the highest-energy work in that window.",
    isResolved: false
  });

  await db.Insight.create({
    type: 'Calendar Gap',
    message: "You have a 2-hour gap in your calendar. It is a good fit for Deep Work.",
    isResolved: false
  });
}

module.exports = { seed };
