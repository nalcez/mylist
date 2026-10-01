
// Masukkan maklumat projek Supabase anda di sini
const SUPABASE_URL = "https://mopacmwyfdykddjtjvog.supabase.co";
const SUPABASE_KEY = "sb_publishable_imxAqgPSbs4ogbYnadjm8A_i_J5FtXZ";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const $ = (selector) => document.querySelector(selector);

const authPanel = $("#authPanel");
const authForm = $("#authForm");
const authMessage = $("#authMessage");
const emailInput = $("#emailInput");
const passwordInput = $("#passwordInput");
const workspace = $("#workspace");
const userEmail = $("#userEmail");

const taskForm = $("#taskForm");
const taskInput = $("#taskInput");
const taskList = $("#taskList");
const emptyState = $("#emptyState");
const totalCount = $("#totalCount");
const pendingCount = $("#pendingCount");
const doneCount = $("#doneCount");
const clearDone = $("#clearDone");
const filterButtons = document.querySelectorAll(".filter");

let tasks = [];
let currentFilter = "all";
let currentUser = null;

$("#todayLabel").textContent = new Intl.DateTimeFormat("ms-MY", {
  weekday: "long",
  day: "numeric",
  month: "long"
}).format(new Date());

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#ff7777" : "inherit";
}

// Daftar akaun
$("#signupButton").addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage("Masukkan emel dan kata laluan.", true);
    return;
  }

  showMessage("Sedang mendaftar...");

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  if (data.session) {
    showMessage("Pendaftaran berjaya!");
  } else {
    showMessage("Semak emel anda untuk mengesahkan akaun.");
  }
});

// Log masuk
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  showMessage("Sedang log masuk...");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage(error.message, true);
  }
});

// Log keluar
$("#logoutButton").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
  }
});

// Paparkan keadaan akaun
async function setUser(user) {
  currentUser = user;
  authPanel.hidden = !!user;
  workspace.hidden = !user;

  if (user) {
    userEmail.textContent = user.email || "";
    await loadTasks();
  } else {
    tasks = [];
    render();
  }
}

// Dapatkan tugasan daripada Supabase
async function loadTasks() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("Gagal memuatkan tugasan: " + error.message);
    return;
  }

  tasks = data.map(row => ({
    id: row.id,
    text: row.title,
    done: row.is_done
  }));

  render();
}

// Paparkan tugasan
function render() {
  taskList.replaceChildren();

  const visibleTasks = tasks.filter(task => {
    if (currentFilter === "pending") return !task.done;
    if (currentFilter === "done") return task.done;
    return true;
  });

  visibleTasks.forEach(task => {
    const item = document.createElement("li");
    item.className = `task-item${task.done ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `Tandakan ${task.text}`);

    checkbox.addEventListener("change", async () => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_done: checkbox.checked })
        .eq("id", task.id);

      if (error) {
        alert("Gagal mengemas kini tugasan: " + error.message);
        return;
      }

      task.done = checkbox.checked;
      render();
    });

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Padam ${task.text}`);

    remove.addEventListener("click", async () => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id);

      if (error) {
        alert("Gagal memadam tugasan: " + error.message);
        return;
      }

      tasks = tasks.filter(entry => entry.id !== task.id);
      render();
    });

    item.append(checkbox, text, remove);
    taskList.append(item);
  });

  const completed = tasks.filter(task => task.done).length;

  totalCount.textContent = tasks.length;
  pendingCount.textContent = tasks.length - completed;
  doneCount.textContent = completed;
  emptyState.hidden = visibleTasks.length > 0;
}

// Tambah tugasan
taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text || !currentUser) return;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: currentUser.id,
      title: text,
      is_done: false
    })
    .select()
    .single();

  if (error) {
    alert("Gagal menambah tugasan: " + error.message);
    return;
  }

  tasks.unshift({
    id: data.id,
    text: data.title,
    done: data.is_done
  });

  taskInput.value = "";
  taskInput.focus();
  render();
});

// Penapis tugasan
filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach(item => {
      item.classList.toggle("active", item === button);
    });

    render();
  });
});

// Padam semua tugasan yang selesai
clearDone.addEventListener("click", async () => {
  if (!currentUser) return;

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("is_done", true);

  if (error) {
    alert("Gagal memadam tugasan: " + error.message);
    return;
  }

  tasks = tasks.filter(task => !task.done);
  render();
});

// Semak sesi pengguna semasa
async function initialize() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    showMessage(error.message, true);
    return;
  }

  await setUser(data.session?.user ?? null);
}

supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user ?? null);
});

initialize();
