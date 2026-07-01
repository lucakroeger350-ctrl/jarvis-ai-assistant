const fs = require('fs');
const path = require('path');
const profiles = require('./profiles');

function calendarFile() { return path.join(profiles.getActiveProfileDir(), 'calendar.json'); }

function readAll() {
  const file = calendarFile();
  if (!fs.existsSync(file)) return { appointments: [] };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { appointments: [] };
  }
}

function writeAll(data) {
  fs.writeFileSync(calendarFile(), JSON.stringify(data, null, 2), 'utf-8');
}

function addAppointment({ title, datetime, bufferMinutes }) {
  const data = readAll();
  const appt = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    datetime, // ISO string
    bufferMinutes: bufferMinutes || 0,
    reminded: false,
  };
  data.appointments.push(appt);
  data.appointments.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  writeAll(data);
  return appt;
}

function listAppointments({ upcomingOnly } = {}) {
  const data = readAll();
  let list = data.appointments;
  if (upcomingOnly) {
    const now = Date.now();
    list = list.filter((a) => new Date(a.datetime).getTime() >= now);
  }
  return list.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
}

function deleteAppointment(id) {
  const data = readAll();
  data.appointments = data.appointments.filter((a) => a.id !== id);
  writeAll(data);
  return data.appointments;
}

function dueReminders() {
  const data = readAll();
  const now = Date.now();
  const REMINDER_LEAD_MS = 15 * 60 * 1000; // 15 Minuten vor dem errechneten Losgeh-Zeitpunkt ankündigen
  const due = [];

  for (const appt of data.appointments) {
    if (appt.reminded) continue;
    const apptTime = new Date(appt.datetime).getTime();
    const leaveBy = apptTime - (appt.bufferMinutes || 0) * 60 * 1000;
    if (now >= leaveBy - REMINDER_LEAD_MS && now <= apptTime) {
      due.push(appt);
      appt.reminded = true;
    }
  }

  if (due.length) writeAll(data);
  return due;
}

module.exports = { addAppointment, listAppointments, deleteAppointment, dueReminders };
