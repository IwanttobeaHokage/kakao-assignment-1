// ===== 상수 =====

const STORAGE_KEY = 'todo-app-data';


// ===== 상태 =====

let todos       = [];
let nextId      = 1;
let currentDate = getDateAtMidnight(new Date());

// 달력 팝업에서 보여주는 연/월 (currentDate와 별개로 관리)
let calendarViewYear;
let calendarViewMonth;


// ===== DOM 참조 =====

const todoInput      = document.getElementById('todoInput');
const dueInput       = document.getElementById('dueInput');
const addButton      = document.getElementById('addButton');
const todoList       = document.getElementById('todoList');
const errorMessage   = document.getElementById('errorMessage');
const emptyMessage   = document.getElementById('emptyMessage');
const dateDisplay    = document.getElementById('dateDisplay');
const prevDateButton = document.getElementById('prevDateButton');
const nextDateButton = document.getElementById('nextDateButton');
const todayButton    = document.getElementById('todayButton');
const calendarPopup  = document.getElementById('calendarPopup');
const calendarTitle  = document.getElementById('calendarTitle');
const calendarDays   = document.getElementById('calendarDays');
const prevMonthButton = document.getElementById('prevMonthButton');
const nextMonthButton = document.getElementById('nextMonthButton');


// ===== 이벤트 등록 =====

addButton.addEventListener('click', handleAddTodo);
todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAddTodo(); });
todoInput.addEventListener('input', clearInputError);

prevDateButton.addEventListener('click', () => navigateDate(-1));
nextDateButton.addEventListener('click', () => navigateDate(1));
todayButton.addEventListener('click', goToToday);

// 날짜 텍스트 클릭 시 달력 팝업 토글
dateDisplay.addEventListener('click', (e) => {
  e.stopPropagation();
  calendarPopup.classList.contains('hidden') ? openCalendar() : closeCalendar();
});

// 달력 팝업 내부 클릭은 전파를 막아 외부클릭 핸들러가 닫지 않게 함
calendarPopup.addEventListener('click', (e) => e.stopPropagation());

prevMonthButton.addEventListener('click', () => navigateCalendarMonth(-1));
nextMonthButton.addEventListener('click', () => navigateCalendarMonth(1));

// 달력 외부 클릭 시 닫기
document.addEventListener('click', () => {
  if (!calendarPopup.classList.contains('hidden')) closeCalendar();
});

// Escape 키로 달력 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !calendarPopup.classList.contains('hidden')) closeCalendar();
});


// ===== 로컬스토리지 =====

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ todos, nextId }));
}

function loadTodos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data.todos) && typeof data.nextId === 'number') {
      todos  = data.todos;
      nextId = data.nextId;
    }
  } catch (e) {
    console.warn('로컬스토리지 데이터 파싱 실패. 초기화합니다.', e);
    localStorage.removeItem(STORAGE_KEY);
  }
}


// ===== 달력 팝업 =====

/**
 * 달력 팝업을 열고 현재 선택된 날짜가 속한 월을 표시한다.
 */
function openCalendar() {
  calendarViewYear  = currentDate.getFullYear();
  calendarViewMonth = currentDate.getMonth();
  renderCalendarGrid();
  calendarPopup.classList.remove('hidden');
}

function closeCalendar() {
  calendarPopup.classList.add('hidden');
}

/**
 * 달력 팝업의 월을 direction만큼 이동하고 그리드를 다시 그린다.
 * @param {number} direction  +1 = 다음달, -1 = 이전달
 */
function navigateCalendarMonth(direction) {
  calendarViewMonth += direction;
  if (calendarViewMonth < 0)  { calendarViewMonth = 11; calendarViewYear--; }
  if (calendarViewMonth > 11) { calendarViewMonth = 0;  calendarViewYear++; }
  renderCalendarGrid();
}

/**
 * calendarViewYear/Month 기준으로 달력 그리드를 렌더링한다.
 */
function renderCalendarGrid() {
  calendarTitle.textContent = `${calendarViewYear}년 ${calendarViewMonth + 1}월`;
  calendarDays.innerHTML = '';

  const todayKey    = formatDateKey(getDateAtMidnight(new Date()));
  const selectedKey = formatDateKey(currentDate);

  // 해당 월의 1일이 무슨 요일인지 (0=일 ~ 6=토)
  const firstWeekday = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  // 해당 월의 총 일수
  const totalDays = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();

  // 1일 이전 빈 셀
  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement('span');
    empty.className = 'cal-day empty';
    calendarDays.appendChild(empty);
  }

  // 날짜 셀
  for (let day = 1; day <= totalDays; day++) {
    const btn     = document.createElement('button');
    btn.textContent = day;
    btn.className   = 'cal-day';

    const dateKey = formatDateKey(new Date(calendarViewYear, calendarViewMonth, day));
    if (dateKey === todayKey)    btn.classList.add('is-today');
    if (dateKey === selectedKey) btn.classList.add('is-selected');

    btn.addEventListener('click', () => {
      selectCalendarDate(calendarViewYear, calendarViewMonth, day);
    });

    calendarDays.appendChild(btn);
  }
}

/**
 * 달력에서 특정 날짜를 선택하면 currentDate를 변경하고 달력을 닫는다.
 */
function selectCalendarDate(year, month, day) {
  currentDate = getDateAtMidnight(new Date(year, month, day));
  closeCalendar();
  updateDateDisplay();
  renderTodos();
}


// ===== 날짜 네비게이션 =====

function navigateDate(direction) {
  const next = getDateAtMidnight(currentDate);
  next.setDate(next.getDate() + direction);
  currentDate = next;
  updateDateDisplay();
  renderTodos();
}

function goToToday() {
  currentDate = getDateAtMidnight(new Date());
  updateDateDisplay();
  renderTodos();
}

function updateDateDisplay() {
  const todayKey   = formatDateKey(getDateAtMidnight(new Date()));
  const currentKey = formatDateKey(currentDate);
  const isToday    = currentKey === todayKey;

  dateDisplay.textContent = formatDisplayDate(currentDate);
  dateDisplay.classList.toggle('is-today', isToday);
  todayButton.classList.toggle('hidden', isToday);
}


// ===== 핵심 기능 =====

function handleAddTodo() {
  const text = todoInput.value.trim();
  if (text === '') {
    showInputError();
    return;
  }

  const newTodo = {
    id:        nextId++,
    text:      text,
    completed: false,
    date:      formatDateKey(currentDate),
    dueAt:     dueInput.value || null, // "YYYY-MM-DDTHH:MM" 또는 null
  };

  todos.push(newTodo);
  todoInput.value = '';
  dueInput.value  = '';
  clearInputError();

  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderTodos();
}

function toggleComplete(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  saveTodos();
  renderTodos();
}

/**
 * 수정 모드로 전환 — 텍스트와 마감 시간을 모두 수정할 수 있다.
 */
function startEditTodo(id) {
  const todo     = todos.find((todo) => todo.id === id);
  const listItem = document.querySelector(`[data-id="${id}"]`);
  if (!todo || !listItem) return;

  listItem.innerHTML = `
    <div class="todo-content">
      <input
        type="text"
        class="edit-input"
        value="${escapeHtml(todo.text)}"
        maxlength="100"
        id="editInput-${id}"
      />
      <div class="edit-due-wrapper">
        <label class="due-label">마감</label>
        <input
          type="datetime-local"
          class="due-input"
          value="${todo.dueAt || ''}"
          id="editDueInput-${id}"
        />
      </div>
    </div>
    <div class="todo-actions">
      <button class="btn btn-save" onclick="saveEditTodo(${id})">저장</button>
      <button class="btn btn-delete" onclick="renderTodos()">취소</button>
    </div>
  `;

  const editInput = document.getElementById(`editInput-${id}`);
  editInput.focus();
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);

  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  saveEditTodo(id);
    if (e.key === 'Escape') renderTodos();
  });
}

function saveEditTodo(id) {
  const editInput    = document.getElementById(`editInput-${id}`);
  const editDueInput = document.getElementById(`editDueInput-${id}`);
  if (!editInput) return;

  const newText = editInput.value.trim();
  if (newText === '') {
    editInput.focus();
    return;
  }

  const newDueAt = editDueInput ? (editDueInput.value || null) : null;

  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, text: newText, dueAt: newDueAt } : todo
  );

  saveTodos();
  renderTodos();
}


// ===== 렌더링 =====

function renderTodos() {
  todoList.innerHTML = '';

  const currentKey    = formatDateKey(currentDate);
  const filteredTodos = todos.filter((todo) => todo.date === currentKey);

  if (filteredTodos.length === 0) {
    emptyMessage.classList.remove('hidden');
    return;
  }

  emptyMessage.classList.add('hidden');
  filteredTodos.forEach((todo) => todoList.appendChild(createTodoElement(todo)));
}

/**
 * Todo 객체를 받아 li 요소를 생성하고 반환한다.
 * 마감 시간이 있으면 텍스트 아래에 표시하며, 기한이 지났으면 빨간색으로 강조한다.
 */
function createTodoElement(todo) {
  const li       = document.createElement('li');
  li.className   = `todo-item${todo.completed ? ' completed' : ''}`;
  li.dataset.id  = todo.id;

  const completeClass = todo.completed ? 'btn btn-complete is-done' : 'btn btn-complete';
  const completeText  = todo.completed ? '취소' : '완료';

  // 마감 시간 HTML (존재할 때만 렌더링)
  const dueHtml = todo.dueAt
    ? `<span class="todo-due ${isDueOverdue(todo) ? 'is-overdue' : ''}">
         ${isDueOverdue(todo) ? '⚠ ' : ''}마감: ${formatDueAt(todo.dueAt)}
       </span>`
    : '';

  li.innerHTML = `
    <div class="todo-content">
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      ${dueHtml}
    </div>
    <div class="todo-actions">
      <button class="${completeClass}" onclick="toggleComplete(${todo.id})">${completeText}</button>
      <button class="btn btn-edit" onclick="startEditTodo(${todo.id})">수정</button>
      <button class="btn btn-delete" onclick="deleteTodo(${todo.id})">삭제</button>
    </div>
  `;

  return li;
}


// ===== 유틸리티 =====

function getDateAtMidnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "YYYY-MM-DD" 형식 반환 (저장·비교용) */
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "YYYY년 M월 D일 (요일)" 형식 반환 (화면 표시용) */
function formatDisplayDate(date) {
  const days  = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

/**
 * datetime-local 값("YYYY-MM-DDTHH:MM")을 "M월 D일 HH:MM" 형식으로 변환한다.
 * @param {string} dueAtStr
 * @returns {string}
 */
function formatDueAt(dueAtStr) {
  const d       = new Date(dueAtStr);
  const month   = d.getMonth() + 1;
  const day     = d.getDate();
  const hours   = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

/**
 * 미완료 상태이면서 마감 시간이 현재보다 이전이면 true를 반환한다.
 * @param {{ completed: boolean, dueAt: string|null }} todo
 * @returns {boolean}
 */
function isDueOverdue(todo) {
  if (!todo.dueAt || todo.completed) return false;
  return new Date(todo.dueAt) < new Date();
}

function showInputError() {
  todoInput.classList.add('input-error');
  errorMessage.classList.remove('hidden');
  todoInput.focus();
}

function clearInputError() {
  todoInput.classList.remove('input-error');
  errorMessage.classList.add('hidden');
}

/** XSS 방지용 HTML 특수문자 이스케이프 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// ===== 초기 실행 =====

loadTodos();
updateDateDisplay();
renderTodos();
