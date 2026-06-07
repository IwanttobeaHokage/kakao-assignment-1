// ===== 상수 =====

const STORAGE_KEY = 'todo-app-data';

// 주간 뷰 요일 레이블 (월~일 순서)
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];


// ===== 상태 =====

let todos       = [];
let nextId      = 1;
let currentDate = getDateAtMidnight(new Date());

// 달력 팝업에서 보여주는 연/월 (currentDate와 별개로 관리)
let calendarViewYear;
let calendarViewMonth;


// ===== DOM 참조 =====

const todoInput       = document.getElementById('todoInput');
const dueInput        = document.getElementById('dueInput');
const addButton       = document.getElementById('addButton');
const todoList        = document.getElementById('todoList');
const errorMessage    = document.getElementById('errorMessage');
const emptyMessage    = document.getElementById('emptyMessage');
const dateDisplay     = document.getElementById('dateDisplay');
const prevDateButton  = document.getElementById('prevDateButton');
const nextDateButton  = document.getElementById('nextDateButton');
const todayButton     = document.getElementById('todayButton');
const calendarPopup   = document.getElementById('calendarPopup');
const calendarTitle   = document.getElementById('calendarTitle');
const calendarDays    = document.getElementById('calendarDays');
const prevMonthButton = document.getElementById('prevMonthButton');
const nextMonthButton = document.getElementById('nextMonthButton');
const weekGrid        = document.getElementById('weekGrid');
const prevWeekButton  = document.getElementById('prevWeekButton');
const nextWeekButton  = document.getElementById('nextWeekButton');


// ===== 이벤트 등록 =====

addButton.addEventListener('click', handleAddTodo);
todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAddTodo(); });
todoInput.addEventListener('input', clearInputError);

prevDateButton.addEventListener('click', () => navigateDate(-1));
nextDateButton.addEventListener('click', () => navigateDate(1));
todayButton.addEventListener('click', goToToday);

// 주간 뷰 이전 / 다음 주 이동
prevWeekButton.addEventListener('click', () => navigateWeek(-1));
nextWeekButton.addEventListener('click', () => navigateWeek(1));

// 날짜 텍스트 클릭 시 달력 팝업 토글
dateDisplay.addEventListener('click', (e) => {
  e.stopPropagation();
  calendarPopup.classList.contains('hidden') ? openCalendar() : closeCalendar();
});

// 달력 팝업 내부 클릭은 외부클릭 핸들러로 전파되지 않도록 차단
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


// ===== 주간 뷰 =====

/**
 * currentDate를 기준으로 주(週)를 direction만큼 이동한다. (+1 = 다음 주, -1 = 이전 주)
 * 같은 요일을 유지한 채 7일씩 이동하며, 날짜 네비게이션과 주간 뷰를 함께 갱신한다.
 */
function navigateWeek(direction) {
  const next = getDateAtMidnight(currentDate);
  next.setDate(next.getDate() + direction * 7);
  currentDate = next;
  updateDateDisplay();
  renderTodos(); // renderTodos 내부에서 renderWeekView도 함께 호출됨
}

/**
 * date가 속한 주의 월~일 날짜 배열(7개)을 반환한다.
 * @param {Date} date
 * @returns {Date[]}
 */
function getWeekDates(date) {
  const d   = getDateAtMidnight(date);
  const dow = d.getDay(); // 0=일, 1=월, ..., 6=토
  // 해당 날짜의 월요일 계산 (일요일이면 6일 전, 그 외엔 dow-1일 전)
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

/**
 * 주간 뷰 그리드를 현재 주(currentDate 기준)로 다시 그린다.
 * renderTodos() 호출 시 자동으로 함께 갱신된다.
 */
function renderWeekView() {
  weekGrid.innerHTML = '';

  const weekDates  = getWeekDates(currentDate);
  const todayKey   = formatDateKey(getDateAtMidnight(new Date()));
  const selectedKey = formatDateKey(currentDate);

  weekDates.forEach((date, index) => {
    const dateKey    = formatDateKey(date);
    const isToday    = dateKey === todayKey;
    const isSelected = dateKey === selectedKey;
    // 해당 날짜에 등록된 Todo 개수
    const count = todos.filter((t) => t.date === dateKey).length;

    const btn = document.createElement('button');
    btn.className = 'week-day';
    if (isToday)    btn.classList.add('is-today');
    if (isSelected) btn.classList.add('is-selected');

    btn.innerHTML = `
      <span class="week-day-label">${DAY_LABELS[index]}</span>
      <span class="week-day-num">${date.getDate()}</span>
      <span class="week-day-count">${count > 0 ? count : ''}</span>
    `;

    // 날짜 셀 클릭 시 해당 날짜로 이동
    btn.addEventListener('click', () => {
      currentDate = getDateAtMidnight(date);
      updateDateDisplay();
      renderTodos();
    });

    weekGrid.appendChild(btn);
  });
}


// ===== 달력 팝업 =====

function openCalendar() {
  calendarViewYear  = currentDate.getFullYear();
  calendarViewMonth = currentDate.getMonth();
  renderCalendarGrid();
  calendarPopup.classList.remove('hidden');
}

function closeCalendar() {
  calendarPopup.classList.add('hidden');
}

function navigateCalendarMonth(direction) {
  calendarViewMonth += direction;
  if (calendarViewMonth < 0)  { calendarViewMonth = 11; calendarViewYear--; }
  if (calendarViewMonth > 11) { calendarViewMonth = 0;  calendarViewYear++; }
  renderCalendarGrid();
}

function renderCalendarGrid() {
  calendarTitle.textContent = `${calendarViewYear}년 ${calendarViewMonth + 1}월`;
  calendarDays.innerHTML = '';

  const todayKey    = formatDateKey(getDateAtMidnight(new Date()));
  const selectedKey = formatDateKey(currentDate);
  const firstWeekday = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  const totalDays    = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();

  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement('span');
    empty.className = 'cal-day empty';
    calendarDays.appendChild(empty);
  }

  for (let day = 1; day <= totalDays; day++) {
    const btn     = document.createElement('button');
    btn.textContent = day;
    btn.className   = 'cal-day';
    const dateKey = formatDateKey(new Date(calendarViewYear, calendarViewMonth, day));
    if (dateKey === todayKey)    btn.classList.add('is-today');
    if (dateKey === selectedKey) btn.classList.add('is-selected');
    btn.addEventListener('click', () => selectCalendarDate(calendarViewYear, calendarViewMonth, day));
    calendarDays.appendChild(btn);
  }
}

function selectCalendarDate(year, month, day) {
  currentDate = getDateAtMidnight(new Date(year, month, day));
  closeCalendar();
  updateDateDisplay();
  renderTodos();
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
    dueAt:     dueInput.value || null,
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

/**
 * 주간 뷰와 Todo 목록을 함께 갱신한다.
 * 상태가 바뀌는 모든 작업 이후 이 함수를 호출한다.
 */
function renderTodos() {
  // Todo 개수가 변할 수 있으므로 주간 뷰도 함께 갱신
  renderWeekView();

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

function createTodoElement(todo) {
  const li      = document.createElement('li');
  li.className  = `todo-item${todo.completed ? ' completed' : ''}`;
  li.dataset.id = todo.id;

  const completeClass = todo.completed ? 'btn btn-complete is-done' : 'btn btn-complete';
  const completeText  = todo.completed ? '취소' : '완료';

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

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

function formatDueAt(dueAtStr) {
  const d = new Date(dueAtStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

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
renderTodos(); // renderWeekView도 내부에서 함께 실행됨
