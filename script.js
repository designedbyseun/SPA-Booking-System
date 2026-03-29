/**
 * SPA Ajibade & Co. — Appointment Booking App
 * script.js  (used by index.html and staff.html)
 *
 * Handles:
 *  - Step navigation (1 → 2 → 3 and back)
 *  - Form validation
 *  - Staff card rendering + selection
 *  - Custom calendar + time slot picker
 *  - Progress bar state
 *  - App state persistence across steps
 */

'use strict';

/* ============================================================
   CONFIG
   ============================================================ */

// Point to your Node.js backend. Update this URL when deployed.
const API_URL = 'https://spa-booking-system-production.up.railway.app';

/* ============================================================
   1. STAFF DATA
   ============================================================
   Replace placeholder emails with real staff emails when ready.
   ============================================================ */
const STAFF = [
  {
    id: 'babatunde',
    name: 'Dr. Babatunde Ajibade, SAN',
    role: 'Managing Partner',
    departments: ['Dispute Resolution', 'Corporate Finance', 'Real Estate'],
    email: 'oawosola@spaajibade.com',
    highlight: false,
  },
  {
    id: 'john',
    name: 'Dr. John Onyido',
    role: 'Partner',
    departments: ['Intellectual Property & Technology'],
    email: 'jonyido@spaajibade.com',
    highlight: false,
  },
  {
    id: 'kolawole',
    name: 'Dr. Kolawole Mayomi',
    role: 'Partner',
    departments: ['Dispute Resolution'],
    email: 'kmayomi@spaajibade.com',
    highlight: false,
  },
  {
    id: 'olubanke',
    name: 'Olubanke Afolabi-Johnson',
    role: 'Chief Operating Officer',
    departments: ['Cross Departmental'],
    email: 'oafolabijohnson@spaajibade.com',
    highlight: true,
  },
  {
    id: 'olalere',
    name: 'Peter Olalere',
    role: 'Associate Partner',
    departments: ['Dispute Resolution', 'Energy and Natural Resources'],
    email: 'oolalere@spaajibade.com',
    highlight: false,
  },
  {
    id: 'magnus',
    name: 'Magnus Ejelonu',
    role: 'Associate Partner',
    departments: ['Energy & Natural Resources'],
    email: 'mejelonu@spaajibade.com',
    highlight: false,
  },
  {
    id: 'bolaji',
    name: 'Bolaji Gabari',
    role: 'Associate Partner',
    departments: ['Corporate Finance'],
    email: 'bgabari@spaajibade.com',
    highlight: false,
  },
  {
    id: 'moruf',
    name: 'Moruf Sowunmi',
    role: 'Associate Partner',
    departments: ['Real Estate & Succession'],
    email: 'msowunmi@spaajibade.com',
    highlight: false,
  },
];

/* ============================================================
   WORKING HOURS CONFIG
   Days: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
   ============================================================ */
const WORKING_HOURS = {
  workDays:   [1, 2, 3, 4, 5],
  startHour:  9,
  endHour:    17,
  slotMins:   30,
  lunchStart: 13,
  lunchEnd:   14,
};

/* ============================================================
   2. APP STATE
   ============================================================ */
const state = {
  currentStep: 1,
  userInfo: {
    firstName: '',
    lastName:  '',
    email:     '',
    phone:     '',
    message:   '',
  },
  selectedStaff: null,
};

const calState = {
  year:         0,
  month:        0,
  selectedDate: null,
  selectedSlot: null,
};

/* ============================================================
   3. DOM REFERENCES
   ============================================================ */
const panels = {
  1: document.getElementById('step-1'),
  2: document.getElementById('step-2'),
  3: document.getElementById('step-3'),
};

const progressSteps = document.querySelectorAll('.progress-step');
const progressLines  = document.querySelectorAll('.progress-line');
const userForm       = document.getElementById('user-form');
const staffGrid      = document.getElementById('staff-grid');
const step2Next      = document.getElementById('step2-next');
const backTo1        = document.getElementById('back-to-1');
const backTo2        = document.getElementById('back-to-2');

/* ============================================================
   4. UTILITY HELPERS
   ============================================================ */

/** Returns initials from a full name. e.g. "Dr. Babatunde Ajibade, SAN" → "BA" */
function getInitials(name) {
  const clean = name.replace(/\b(Dr|Mr|Mrs|Ms|Prof|SAN|PhD|Esq)\b\.?/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function showError(inputEl, errorElId, message) {
  const errEl = document.getElementById(errorElId);
  if (errEl) errEl.textContent = message;
  inputEl.classList.add('error');
  inputEl.setAttribute('aria-invalid', 'true');
  inputEl.setAttribute('aria-describedby', errorElId);
}

function clearError(inputEl, errorElId) {
  const errEl = document.getElementById(errorElId);
  if (errEl) errEl.textContent = '';
  inputEl.classList.remove('error');
  inputEl.removeAttribute('aria-invalid');
  inputEl.removeAttribute('aria-describedby');
}

/* ============================================================
   5. PROGRESS BAR
   ============================================================ */
function updateProgress(step) {
  progressSteps.forEach((el, i) => {
    const stepNum = i + 1;
    el.classList.remove('active', 'completed');
    if (stepNum < step)   el.classList.add('completed');
    if (stepNum === step) el.classList.add('active');
  });

  progressLines.forEach((line, i) => {
    if (i + 2 <= step) line.classList.add('done');
    else               line.classList.remove('done');
  });

  const track = document.querySelector('.progress-track');
  if (track) track.setAttribute('aria-valuenow', step);
}

/* ============================================================
   6. STEP TRANSITIONS
   ============================================================ */
function goToStep(targetStep) {
  const currentPanel = panels[state.currentStep];
  const targetPanel  = panels[targetStep];
  if (!currentPanel || !targetPanel) return;

  currentPanel.classList.add('exit');
  currentPanel.addEventListener('animationend', () => {
    currentPanel.classList.remove('active', 'exit');
    targetPanel.classList.add('active');
    targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, { once: true });

  state.currentStep = targetStep;
  updateProgress(targetStep);

  if (targetStep === 2) setupStep2();
  if (targetStep === 3) setupStep3();
}

/* ============================================================
   7. STEP 1 — USER INFORMATION
   ============================================================ */
function validateAndCollectStep1() {
  const firstNameEl = document.getElementById('first-name');
  const lastNameEl  = document.getElementById('last-name');
  const emailEl     = document.getElementById('email');
  const messageEl   = document.getElementById('message');
  let valid = true;

  clearError(firstNameEl, 'first-name-error');
  if (!firstNameEl.value.trim()) {
    showError(firstNameEl, 'first-name-error', 'First name is required.');
    valid = false;
  }

  clearError(lastNameEl, 'last-name-error');
  if (!lastNameEl.value.trim()) {
    showError(lastNameEl, 'last-name-error', 'Last name is required.');
    valid = false;
  }

  clearError(emailEl, 'email-error');
  if (!emailEl.value.trim()) {
    showError(emailEl, 'email-error', 'Email address is required.');
    valid = false;
  } else if (!isValidEmail(emailEl.value)) {
    showError(emailEl, 'email-error', 'Please enter a valid email address.');
    valid = false;
  }

  clearError(messageEl, 'message-error');
  if (!messageEl.value.trim()) {
    showError(messageEl, 'message-error', 'Please describe your request.');
    valid = false;
  }

  if (valid) {
    state.userInfo.firstName = firstNameEl.value.trim();
    state.userInfo.lastName  = lastNameEl.value.trim();
    state.userInfo.email     = emailEl.value.trim();
    state.userInfo.phone     = document.getElementById('phone').value.trim();
    state.userInfo.message   = messageEl.value.trim();
  }

  return valid;
}

['first-name', 'last-name', 'email', 'message'].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => clearError(el, `${id}-error`));
});

userForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (validateAndCollectStep1()) goToStep(2);
});

/* ============================================================
   8. STEP 2 — STAFF SELECTION
   ============================================================ */
function renderStaffCards() {
  staffGrid.innerHTML = '';

  STAFF.forEach((member) => {
    const card = document.createElement('div');
    card.className = `staff-card${member.highlight ? ' highlight' : ''}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', `Select ${member.name}, ${member.role}`);
    card.dataset.id = member.id;

    const deptTagsHTML = member.departments
      .map((d) => `<span class="dept-tag">${d}</span>`)
      .join('');

    card.innerHTML = `
      ${member.highlight ? '<span class="card-badge">Cross-Department</span>' : ''}
      <div class="card-avatar">${getInitials(member.name)}</div>
      <div class="card-name">${member.name}</div>
      <div class="card-role">${member.role}</div>
      <div class="card-departments">${deptTagsHTML}</div>
      <div class="card-check" aria-hidden="true">
        <svg viewBox="0 0 12 12"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>
      </div>
    `;

    card.addEventListener('click', () => selectStaff(card, member));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectStaff(card, member);
      }
    });

    staffGrid.appendChild(card);
  });
}

function selectStaff(cardEl, member) {
  document.querySelectorAll('.staff-card').forEach((c) => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });

  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-pressed', 'true');
  state.selectedStaff = member;
  step2Next.disabled = false;
}

function setupStep2() {
  if (staffGrid.children.length === 0) renderStaffCards();

  if (state.selectedStaff) {
    const prevCard = staffGrid.querySelector(`[data-id="${state.selectedStaff.id}"]`);
    if (prevCard) {
      prevCard.classList.add('selected');
      prevCard.setAttribute('aria-pressed', 'true');
      step2Next.disabled = false;
    }
  }
}

step2Next.addEventListener('click', () => {
  if (state.selectedStaff) goToStep(3);
});

backTo1.addEventListener('click', () => goToStep(1));

/* ============================================================
   9. STEP 3 — CALENDAR + TIME SLOT PICKER
   ============================================================ */
function populateBookingInfo() {
  const member = state.selectedStaff;
  if (!member) return;

  document.getElementById('booking-staff-name').textContent = member.name;
  document.getElementById('booking-staff-role').textContent = member.role || member.departments.join(', ');
  document.getElementById('booking-avatar').textContent     = getInitials(member.name);
}

function getSlotsForDate() {
  const slots = [];
  const { startHour, endHour, slotMins, lunchStart, lunchEnd } = WORKING_HOURS;
  let hour = startHour;
  let min  = 0;

  while (hour < endHour) {
    if (!(hour >= lunchStart && hour < lunchEnd)) {
      const h12  = hour % 12 === 0 ? 12 : hour % 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const mm   = min === 0 ? '00' : String(min);
      slots.push(`${h12}:${mm} ${ampm}`);
    }
    min += slotMins;
    if (min >= 60) { min -= 60; hour++; }
  }

  return slots;
}

function isAvailable(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return false;
  return WORKING_HOURS.workDays.includes(date.getDay());
}

function renderCalendar() {
  const { year, month } = calState;
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  document.getElementById('cal-month-label').textContent = `${monthNames[month]} ${year}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date  = new Date(year, month, d);
    const avail = isAvailable(date);
    const isSel = calState.selectedDate && date.getTime() === calState.selectedDate.getTime();

    let cls = 'cal-day';
    if (date < today)        cls += ' past';
    else if (avail)          cls += ' available';
    if (date.getTime() === today.getTime()) cls += ' today';
    if (isSel)               cls += ' selected';

    const cell = document.createElement('div');
    cell.className   = cls;
    cell.textContent = d;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `${monthNames[month]} ${d}, ${year}${avail ? ' – available' : ' – unavailable'}`);

    if (avail) {
      cell.setAttribute('tabindex', '0');
      cell.addEventListener('click', () => handleDateSelect(date));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDateSelect(date); }
      });
    }

    grid.appendChild(cell);
  }
}

function handleDateSelect(date) {
  calState.selectedDate = date;
  calState.selectedSlot = null;
  renderCalendar();

  document.getElementById('slots-divider').hidden = false;

  const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  document.getElementById('slots-date-label').textContent =
    `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;

  const slotsList = document.getElementById('slots-list');
  slotsList.innerHTML = '';

  getSlotsForDate().forEach((slot) => {
    const btn = document.createElement('button');
    btn.className   = 'slot-btn';
    btn.textContent = slot;
    btn.setAttribute('aria-label', `Book at ${slot}`);
    btn.addEventListener('click', () => handleSlotSelect(btn, slot));
    slotsList.appendChild(btn);
  });

  document.getElementById('booking-slots').hidden           = false;
  document.getElementById('confirm-actions').style.display  = 'none';
  document.getElementById('booking-summary').hidden         = true;
}

function handleSlotSelect(btnEl, slot) {
  document.querySelectorAll('.slot-btn').forEach((b) => b.classList.remove('selected'));
  btnEl.classList.add('selected');
  calState.selectedSlot = slot;

  const date       = calState.selectedDate;
  const dayNames   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  document.getElementById('summary-value').textContent =
    `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}\n${slot}`;

  document.getElementById('booking-summary').hidden         = false;
  document.getElementById('confirm-actions').style.display  = 'flex';
}

async function handleConfirmBooking() {
  const member = state.selectedStaff;
  const date   = calState.selectedDate;
  const slot   = calState.selectedSlot;
  if (!member || !date || !slot) return;

  const confirmBtn = document.getElementById('confirm-booking');
  confirmBtn.disabled    = true;
  confirmBtn.textContent = 'Sending…';

  const dayNames   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const bookingDate = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  try {
    const response = await fetch(`${API_URL}/api/book`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffEmail:  member.email,
        staffName:   member.name,
        firstName:   state.userInfo.firstName,
        lastName:    state.userInfo.lastName,
        email:       state.userInfo.email,
        phoneNumber: state.userInfo.phone || 'Not provided',
        date:        bookingDate,
        time:        slot,
        description: state.userInfo.message || 'No specific description provided.',
      }),
    });

    if (!response.ok) throw new Error(`Server responded with ${response.status}`);

    document.querySelector('.booking-shell').style.display  = 'none';
    document.getElementById('confirm-actions').style.display = 'none';
    document.getElementById('success-message').textContent  =
      `Your request to meet with ${member.name} on ${bookingDate} at ${slot} has been sent successfully.`;
    document.getElementById('booking-success').hidden = false;

    // After a delay of 7 seconds, reset the process
    setTimeout(() => {
      userForm.reset();
      state.selectedStaff = null;
      state.userInfo = { firstName: '', lastName: '', email: '', phone: '', message: '' };
      calState.selectedDate = null;
      calState.selectedSlot = null;
      init();
    }, 7000);

  } catch (err) {
    console.error('Booking error:', err);
    confirmBtn.disabled    = false;
    confirmBtn.textContent = 'Confirm Booking';
    alert('Failed to send booking. Please check your connection and try again.');
  }
}

function setupStep3() {
  populateBookingInfo();

  const now = new Date();
  calState.year         = now.getFullYear();
  calState.month        = now.getMonth();
  calState.selectedDate = null;
  calState.selectedSlot = null;

  document.getElementById('booking-slots').hidden           = true;
  document.getElementById('slots-divider').hidden           = true;
  document.getElementById('booking-summary').hidden         = true;
  document.getElementById('confirm-actions').style.display  = 'none';
  document.getElementById('booking-success').hidden         = true;
  document.querySelector('.booking-shell').style.display    = '';

  renderCalendar();
}

document.getElementById('cal-prev').addEventListener('click', () => {
  calState.month--;
  if (calState.month < 0) { calState.month = 11; calState.year--; }
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  calState.month++;
  if (calState.month > 11) { calState.month = 0; calState.year++; }
  renderCalendar();
});

document.getElementById('confirm-booking').addEventListener('click', handleConfirmBooking);
backTo2.addEventListener('click', () => goToStep(2));

/* ============================================================
   10. INIT
   ============================================================ */
function init() {
  updateProgress(1);
  Object.values(panels).forEach((panel) => panel.classList.remove('active'));
  panels[1].classList.add('active');
}

init();
