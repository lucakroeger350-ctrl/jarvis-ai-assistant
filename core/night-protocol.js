const { exec } = require('child_process');

function minimizeAllWindows() {
  return new Promise((resolve) => {
    exec('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).MinimizeAll()"', () => resolve());
  });
}

function buildGoodbyeMessage(userName) {
  const hour = new Date().getHours();
  const name = userName || 'Sir';
  if (hour >= 5 && hour < 18) {
    return `${name}, alle Systeme werden nun heruntergefahren. Ich wünsche Ihnen einen erfolgreichen Tag.`;
  }
  return `${name}, alle Systeme werden nun heruntergefahren. Ich wünsche Ihnen eine gute Nacht.`;
}

module.exports = { minimizeAllWindows, buildGoodbyeMessage };
