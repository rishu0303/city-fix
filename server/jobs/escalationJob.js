import cron from 'node-cron';
import Complaint from '../models/Complaint.js';

export const startEscalationEngine = () => {
  // ⏰ CRON EXPRESSION: Run every minute for testing ('* * * * *')
  // In production, you might run this hourly: ('0 * * * *')
  cron.schedule('* * * * *', async () => {
    console.log('⚙️ [CRON] Running Priority Escalation Engine...');
    
    try {
      // Find all complaints that are NOT Resolved or Rejected
      const openComplaints = await Complaint.find({
        status: { $nin: ['Resolved', 'Rejected'] }
      });

      let escalatedCount = 0;

      for (const complaint of openComplaints) {
        // Calculate how many hours have passed since the complaint was created
        const hoursPending = Math.abs(new Date() - complaint.createdAt) / 36e5; // 36e5 ms = 1 hour

        // 🧠 ALGORITHM: Upvotes = 2 pts, Severity = 5 pts, +1 pt per hour ignored
        const newScore = Math.floor((complaint.upvotes * 2) + (complaint.severityRating * 5) + hoursPending);
        
        complaint.priorityScore = newScore;

        // 🔥 ESCALATION TRIGGER: Threshold set very low for testing (0.05 hours = 3 minutes)
        if (hoursPending > 0.05 && !complaint.isEscalated) {
          complaint.isEscalated = true;
          
          // Add a system note to the timeline
          complaint.timeline.push({
            status: complaint.status,
            note: '🚨 SYSTEM AUTO-ESCALATION: Issue unresolved past SLA threshold. Priority boosted.',
          });
          
          escalatedCount++;
        }

        // Save the updated complaint silently in the background
        await complaint.save();
      }

      console.log(`✅ [CRON] Engine complete. Escalated ${escalatedCount} issues. Updated ${openComplaints.length} scores.`);
    } catch (error) {
      console.error('❌ [CRON] Escalation Engine Error:', error);
    }
  });
};