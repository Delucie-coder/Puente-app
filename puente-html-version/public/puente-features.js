// ============ PuenteFeatures ============
// This file provides week loading for dashboard-moto.html

window.PuenteFeatures = {

  WEEK_TITLES: [
    "Greetings",
    "Listening",
    "Vocabulary",
    "Speaking Practice",
    "Conversation",
    "Review & Quiz"
  ],

  WEEK_VIDEOS: [
    "7aWhs5G6I-I", // Week 1 video
    "eD0U8VgGv0A", // Week 2 video
    "dQw4w9WgXcQ", // Week 3 video
    "tAGnKpE4NCI", // Week 4
    "V-_O7nl0Ii0", // Week 5
    "kXYiU_JCYtU"  // Week 6
  ],

  init() {
    console.log("PuenteFeatures.init() called");
    this.loadWeek(1);
  },

  loadWeek(week) {
    console.log("PuenteFeatures.loadWeek():", week);

    // Update lesson title
    const title = this.WEEK_TITLES[week - 1] || "Lesson";
    const titleEl = document.getElementById("lessonTitle");
    const headerEl = document.getElementById("headerWeekLabel");

    if (titleEl) titleEl.textContent = `Week ${week}: ${title}`;
    if (headerEl) headerEl.textContent = `Week ${week}: ${title}`;

    // Update YouTube video
    const videoId = this.WEEK_VIDEOS[week - 1];
    const iframe = document.getElementById("ytPlayer");
    if (iframe && videoId) {
      iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0`;
    }

    // Reset checkboxes when week changes
    document.querySelectorAll("[data-act]").forEach(cb => {
      cb.checked = false;
    });

    console.log(`Week ${week} loaded successfully.`);
  }
};
