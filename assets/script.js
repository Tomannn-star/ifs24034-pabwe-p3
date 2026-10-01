/**
 * ====================================================================
 * DelHub Workspace — Praktikum 3 PABWE
 * Pengembang: Toman Sihombing (11S24034 / ifs24034)
 * Fitur:
 *   1. Tab Navigation & State Persistence (localStorage)
 *   2. Catatan Pengeluaran Harian (Expense Tracker - CRUD + Summary + Filter)
 *   3. Bookmark / Link Manager (CRUD + URL Validation + Clipboard Copy)
 *   4. Kuis Interaktif (Quiz App - Array of Objects + High Score + Review)
 * ====================================================================
 */

"use strict";

/* ====================================================================
   1. FUNGSI UTILITAS UMUM & HELPER DOM
   ==================================================================== */

/**
 * Selektor DOM tunggal dengan error handling untuk kemudahan debugging
 * @param {string} selector 
 * @returns {HTMLElement}
 */
function $(selector) {
  const el = document.querySelector(selector);
  if (!el) {
    console.warn(`Elemen tidak ditemukan untuk selektor: ${selector}`);
  }
  return el;
}

/**
 * Selektor DOM jamak
 * @param {string} selector 
 * @returns {NodeListOf<HTMLElement>}
 */
function $all(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Format angka ke format mata uang Rupiah Indonesia (Rp xx.xxx)
 * @param {number} num 
 * @returns {string}
 */
function formatRupiah(num) {
  const validNum = Number(num) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(validNum);
}

/**
 * Format string tanggal YYYY-MM-DD menjadi format tanggal Indonesia
 * @param {string} dateStr 
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Escape string HTML untuk mencegah kerentanan Cross-Site Scripting (XSS)
 * @param {string} str 
 * @returns {string}
 */
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Menampilkan pesan toast melayang di pojok kanan bawah
 * @param {string} message 
 * @param {"success"|"error"|"info"} type 
 */
function showToast(message, type = "success") {
  const container = $("#toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  const bgStyles = {
    success: "bg-emerald-800 text-white border-emerald-900",
    error: "bg-rose-800 text-white border-rose-900",
    info: "bg-slate-900 text-white border-slate-950",
  };
  const icons = {
    success: "ti-circle-check",
    error: "ti-alert-triangle",
    info: "ti-info-circle",
  };

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 ${bgStyles[type] || bgStyles.info}`;
  toast.innerHTML = `<i class="ti ${icons[type] || icons.info} text-lg shrink-0"></i><span>${escapeHTML(message)}</span>`;

  container.appendChild(toast);

  // Animasi masuk
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  });

  // Hilangkan otomatis setelah 3 detik
  setTimeout(() => {
    toast.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ====================================================================
   2. PENGELOLAAN MODAL (ACCESSIBILITY & EVENT)
   ==================================================================== */

/**
 * Membuka jendela modal
 * @param {HTMLElement} modalEl 
 */
function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove("hidden");
  modalEl.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

/**
 * Menutup jendela modal
 * @param {HTMLElement} modalEl 
 */
function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  modalEl.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

// Inisialisasi event penutup modal (backdrop, tombol X, dan tombol Batal)
function initModalListeners() {
  // Tutup via tombol dengan atribut data-close-modal
  $all("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalType = btn.dataset.closeModal;
      if (modalType === "edit-expense") closeModal($("#modal-edit-expense"));
      if (modalType === "delete-expense") closeModal($("#modal-delete-expense"));
      if (modalType === "edit-bookmark") closeModal($("#modal-edit-bookmark"));
      if (modalType === "delete-bookmark") closeModal($("#modal-delete-bookmark"));
    });
  });

  // Tutup jika backdrop diklik
  $all(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      const modal = e.target.closest("[role='dialog']");
      if (modal) closeModal(modal);
    });
  });

  // Tutup modal jika tombol keyboard Escape ditekan
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = $all("[role='dialog']:not(.hidden)");
      openModals.forEach((m) => closeModal(m));
    }
  });
}

/* ====================================================================
   3. TAB SWITCHER DENGAN LOCALSTORAGE
   ==================================================================== */

const TAB_STORAGE_KEY = "ifs24034-p3-active-tab";
const tabButtons = $all(".tab-btn");
const tabPanels = {
  expense: $("#panel-expense"),
  bookmark: $("#panel-bookmark"),
  quiz: $("#panel-quiz"),
};

/**
 * Mengganti tab aktif dan menyimpan pilihan ke localStorage
 * @param {string} tabName 
 */
function switchTab(tabName) {
  if (!tabPanels[tabName]) tabName = "expense";

  // Toggle tampilan panel
  Object.entries(tabPanels).forEach(([key, panel]) => {
    if (panel) {
      panel.classList.toggle("hidden", key !== tabName);
    }
  });

  // Update styling tombol tab
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.setAttribute("aria-selected", String(isActive));

    if (isActive) {
      btn.className =
        "tab-btn flex-1 flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-sky-600 text-white shadow-sm";
    } else {
      btn.className =
        "tab-btn flex-1 flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100";
    }
  });

  // Simpan status tab ke localStorage
  localStorage.setItem(TAB_STORAGE_KEY, tabName);
}

// Event listener untuk tombol tab
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Pulihkan tab terakhir atau default ke 'expense'
const savedTab = localStorage.getItem(TAB_STORAGE_KEY) || "expense";

/* ====================================================================
   4. FITUR 1: CATATAN PENGELUARAN HARIAN (EXPENSE TRACKER)
   ==================================================================== */

const EXPENSE_STORAGE_KEY = "ifs24034-p3-expenses";

// Data awal (seed data) jika localStorage masih kosong
const DEFAULT_EXPENSES = [
  {
    id: "exp-sample-1",
    title: "Kiriman Uang Bulanan",
    type: "Pemasukan",
    category: "Gaji & Honor",
    amount: 1500000,
    date: "2026-09-01",
    createdAt: 1725148800000,
  },
  {
    id: "exp-sample-2",
    title: "Makan Siang & Kopi Kantin Del",
    type: "Pengeluaran",
    category: "Makanan & Minuman",
    amount: 28000,
    date: "2026-09-28",
    createdAt: 1727481600000,
  },
  {
    id: "exp-sample-3",
    title: "Buku Panduan Pemrograman Web",
    type: "Pengeluaran",
    category: "Pendidikan",
    amount: 95000,
    date: "2026-09-29",
    createdAt: 1727568000000,
  },
  {
    id: "exp-sample-4",
    title: "Pulsa & Paket Data Internet",
    type: "Pengeluaran",
    category: "Tagihan",
    amount: 75000,
    date: "2026-09-30",
    createdAt: 1727654400000,
  },
];

let expenses = loadExpenses();
let editingExpenseId = null;
let deletingExpenseId = null;

// Elemen DOM Expense
const expenseForm = $("#expense-form");
const expenseTitleInput = $("#expense-title");
const expenseTypeSelect = $("#expense-type");
const expenseCategorySelect = $("#expense-category");
const expenseAmountInput = $("#expense-amount");
const expenseDateInput = $("#expense-date");

const expenseSearchInput = $("#expense-search");
const expenseFilterType = $("#expense-filter-type");
const expenseFilterCategory = $("#expense-filter-category");
const expenseSortSelect = $("#expense-sort");

const expenseListEl = $("#expense-list");
const expenseEmptyEl = $("#expense-empty");
const expenseCountBadge = $("#expense-count-badge");

const statTotalIncome = $("#stat-total-income");
const statTotalExpense = $("#stat-total-expense");
const statNetBalance = $("#stat-net-balance");
const statBalanceDesc = $("#stat-balance-desc");

// Elemen Modal Edit Expense
const modalEditExpense = $("#modal-edit-expense");
const formEditExpense = $("#form-edit-expense");
const editExpenseTitle = $("#edit-expense-title");
const editExpenseType = $("#edit-expense-type");
const editExpenseCategory = $("#edit-expense-category");
const editExpenseAmount = $("#edit-expense-amount");
const editExpenseDate = $("#edit-expense-date");

// Elemen Modal Delete Expense
const modalDeleteExpense = $("#modal-delete-expense");
const deleteExpenseTitle = $("#delete-expense-title");
const deleteExpenseAmount = $("#delete-expense-amount");
const btnConfirmDeleteExpense = $("#btn-confirm-delete-expense");

/**
 * Muat data transaksi dari localStorage
 * @returns {Array}
 */
function loadExpenses() {
  try {
    const raw = localStorage.getItem(EXPENSE_STORAGE_KEY);
    if (!raw) {
      // Simpan data awal jika baru pertama dibuka
      localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(DEFAULT_EXPENSES));
      return [...DEFAULT_EXPENSES];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Gagal membaca data pengeluaran:", err);
    return [];
  }
}

/**
 * Simpan data transaksi ke localStorage
 */
function saveExpenses() {
  try {
    localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.error("Gagal menyimpan data pengeluaran:", err);
  }
}

/**
 * Hitung dan perbarui ringkasan keuangan (Total Pemasukan, Pengeluaran, Saldo)
 */
function updateExpenseSummary() {
  let income = 0;
  let expense = 0;

  expenses.forEach((item) => {
    const amount = Number(item.amount) || 0;
    if (item.type === "Pemasukan") {
      income += amount;
    } else {
      expense += amount;
    }
  });

  const balance = income - expense;

  if (statTotalIncome) statTotalIncome.textContent = formatRupiah(income);
  if (statTotalExpense) statTotalExpense.textContent = formatRupiah(expense);
  if (statNetBalance) {
    statNetBalance.textContent = formatRupiah(balance);
    if (balance >= 0) {
      statNetBalance.className = "font-display text-2xl font-extrabold text-sky-600";
      if (statBalanceDesc) statBalanceDesc.textContent = "Status keuangan aman (surplus)";
    } else {
      statNetBalance.className = "font-display text-2xl font-extrabold text-rose-600";
      if (statBalanceDesc) statBalanceDesc.textContent = "Pengeluaran melebihi pemasukan (defisit)";
    }
  }
}

/**
 * Warna ikon kategori
 * @param {string} category 
 * @returns {{icon: string, color: string}}
 */
function getCategoryMeta(category) {
  const metaMap = {
    "Makanan & Minuman": { icon: "ti-soup", color: "bg-amber-100 text-amber-700" },
    "Transportasi": { icon: "ti-bus", color: "bg-blue-100 text-blue-700" },
    "Belanja": { icon: "ti-shopping-bag", color: "bg-purple-100 text-purple-700" },
    "Tagihan": { icon: "ti-receipt", color: "bg-red-100 text-red-700" },
    "Pendidikan": { icon: "ti-school", color: "bg-emerald-100 text-emerald-700" },
    "Hiburan": { icon: "ti-device-gamepad", color: "bg-pink-100 text-pink-700" },
    "Gaji & Honor": { icon: "ti-coin", color: "bg-teal-100 text-teal-700" },
    "Investasi": { icon: "ti-chart-line", color: "bg-cyan-100 text-cyan-700" },
    "Lainnya": { icon: "ti-category", color: "bg-slate-100 text-slate-700" },
  };
  return metaMap[category] || { icon: "ti-tag", color: "bg-slate-100 text-slate-700" };
}

/**
 * Filter, sort, dan render daftar transaksi ke DOM
 */
function renderExpenses() {
  updateExpenseSummary();

  const query = (expenseSearchInput?.value || "").trim().toLowerCase();
  const filterType = expenseFilterType?.value || "all";
  const filterCategory = expenseFilterCategory?.value || "all";
  const sortBy = expenseSortSelect?.value || "date-desc";

  // Filter
  let filtered = expenses.filter((item) => {
    const matchQuery = (item.title || "").toLowerCase().includes(query);
    const matchType = filterType === "all" || item.type === filterType;
    const matchCategory = filterCategory === "all" || item.category === filterCategory;
    return matchQuery && matchType && matchCategory;
  });

  // Sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "date-asc":
        return (a.date || "").localeCompare(b.date || "") || (a.createdAt - b.createdAt);
      case "amount-desc":
        return Number(b.amount) - Number(a.amount);
      case "amount-asc":
        return Number(a.amount) - Number(b.amount);
      case "title-asc":
        return (a.title || "").localeCompare(b.title || "", "id");
      case "date-desc":
      default:
        return (b.date || "").localeCompare(a.date || "") || (b.createdAt - a.createdAt);
    }
  });

  if (expenseCountBadge) {
    expenseCountBadge.textContent = `${filtered.length} transaksi`;
  }

  // Handle Empty State
  const hasNoItems = filtered.length === 0;
  if (expenseEmptyEl) expenseEmptyEl.classList.toggle("hidden", !hasNoItems);
  if (expenseListEl) expenseListEl.classList.toggle("hidden", hasNoItems);

  if (!expenseListEl) return;
  expenseListEl.innerHTML = "";

  if (hasNoItems) return;

  // Render via DOM createElement
  filtered.forEach((item) => {
    const li = document.createElement("li");
    li.className =
      "group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white transition duration-150";
    li.dataset.id = item.id;

    const isIncome = item.type === "Pemasukan";
    const catMeta = getCategoryMeta(item.category);

    // Bagian Info Kiri
    const leftDiv = document.createElement("div");
    leftDiv.className = "flex items-start gap-3 flex-1 min-w-0";

    const catIconWrapper = document.createElement("div");
    catIconWrapper.className = `w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${catMeta.color}`;
    catIconWrapper.innerHTML = `<i class="ti ${catMeta.icon}"></i>`;

    const textInfo = document.createElement("div");
    textInfo.className = "flex-1 min-w-0";

    const titleEl = document.createElement("p");
    titleEl.className = "font-semibold text-slate-900 text-sm truncate";
    titleEl.textContent = item.title;

    const metaRow = document.createElement("div");
    metaRow.className = "flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500";

    const dateSpan = document.createElement("span");
    dateSpan.className = "flex items-center gap-1";
    dateSpan.innerHTML = `<i class="ti ti-calendar text-slate-400"></i> ${formatDate(item.date)}`;

    const catBadge = document.createElement("span");
    catBadge.className = "px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium";
    catBadge.textContent = item.category;

    const typeBadge = document.createElement("span");
    typeBadge.className = `px-2 py-0.5 rounded-md font-semibold ${
      isIncome ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
    }`;
    typeBadge.textContent = item.type;

    metaRow.append(dateSpan, catBadge, typeBadge);
    textInfo.append(titleEl, metaRow);
    leftDiv.append(catIconWrapper, textInfo);

    // Bagian Kanan (Nominal & Tombol Aksi)
    const rightDiv = document.createElement("div");
    rightDiv.className = "flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100";

    const amountEl = document.createElement("p");
    amountEl.className = `font-display text-base font-bold tracking-tight ${
      isIncome ? "text-emerald-600" : "text-rose-600"
    }`;
    amountEl.textContent = `${isIncome ? "+" : "-"}${formatRupiah(item.amount)}`;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "flex items-center gap-1.5";

    // Tombol Ubah
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition";
    editBtn.innerHTML = '<i class="ti ti-pencil"></i><span class="hidden md:inline">Ubah</span>';
    editBtn.setAttribute("aria-label", `Ubah transaksi ${item.title}`);
    editBtn.addEventListener("click", () => openEditExpenseModal(item.id));

    // Tombol Hapus
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition";
    deleteBtn.innerHTML = '<i class="ti ti-trash"></i><span class="hidden md:inline">Hapus</span>';
    deleteBtn.setAttribute("aria-label", `Hapus transaksi ${item.title}`);
    deleteBtn.addEventListener("click", () => openDeleteExpenseModal(item.id));

    actionsDiv.append(editBtn, deleteBtn);
    rightDiv.append(amountEl, actionsDiv);

    li.append(leftDiv, rightDiv);
    expenseListEl.appendChild(li);
  });
}

/**
 * Buka modal ubah transaksi
 * @param {string} id 
 */
function openEditExpenseModal(id) {
  const item = expenses.find((x) => x.id === id);
  if (!item) return;

  editingExpenseId = id;
  editExpenseTitle.value = item.title;
  editExpenseType.value = item.type;
  editExpenseCategory.value = item.category;
  editExpenseAmount.value = item.amount;
  editExpenseDate.value = item.date;

  openModal(modalEditExpense);
  editExpenseTitle.focus();
}

/**
 * Buka modal konfirmasi hapus transaksi
 * @param {string} id 
 */
function openDeleteExpenseModal(id) {
  const item = expenses.find((x) => x.id === id);
  if (!item) return;

  deletingExpenseId = id;
  deleteExpenseTitle.textContent = `"${item.title}" (${item.category})`;
  deleteExpenseAmount.textContent = `${item.type}: ${formatRupiah(item.amount)}`;

  openModal(modalDeleteExpense);
}

// Inisialisasi Event Handlers untuk Expense Tracker
function initExpenseEvents() {
  // Set default tanggal hari ini
  if (expenseDateInput) {
    const today = new Date().toISOString().split("T")[0];
    expenseDateInput.value = today;
  }

  // Tambah Transaksi
  expenseForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = (expenseTitleInput?.value || "").trim();
    const type = expenseTypeSelect?.value || "Pengeluaran";
    const category = expenseCategorySelect?.value || "Lainnya";
    const amount = Number(expenseAmountInput?.value);
    const date = expenseDateInput?.value;

    if (!title) {
      showToast("Deskripsi transaksi wajib diisi!", "error");
      return;
    }
    if (!amount || amount <= 0) {
      showToast("Jumlah transaksi harus berupa angka positif!", "error");
      return;
    }
    if (!date) {
      showToast("Tanggal transaksi wajib dipilih!", "error");
      return;
    }

    const newExpense = {
      id: "exp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      title,
      type,
      category,
      amount,
      date,
      createdAt: Date.now(),
    };

    expenses.unshift(newExpense);
    saveExpenses();
    renderExpenses();

    // Reset Form
    expenseForm.reset();
    expenseTypeSelect.value = "Pengeluaran";
    expenseCategorySelect.value = "Makanan & Minuman";
    const today = new Date().toISOString().split("T")[0];
    expenseDateInput.value = today;

    showToast("Transaksi berhasil ditambahkan!", "success");
  });

  // Simpan Perubahan Edit Transaksi
  formEditExpense?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!editingExpenseId) return;

    const title = (editExpenseTitle?.value || "").trim();
    const type = editExpenseType?.value || "Pengeluaran";
    const category = editExpenseCategory?.value || "Lainnya";
    const amount = Number(editExpenseAmount?.value);
    const date = editExpenseDate?.value;

    if (!title || !amount || amount <= 0 || !date) {
      showToast("Periksa kembali kelengkapan formulir!", "error");
      return;
    }

    const item = expenses.find((x) => x.id === editingExpenseId);
    if (item) {
      item.title = title;
      item.type = type;
      item.category = category;
      item.amount = amount;
      item.date = date;

      saveExpenses();
      renderExpenses();
      closeModal(modalEditExpense);
      showToast("Data transaksi berhasil diperbarui!", "success");
    }
    editingExpenseId = null;
  });

  // Konfirmasi Hapus Transaksi
  btnConfirmDeleteExpense?.addEventListener("click", () => {
    if (!deletingExpenseId) return;
    expenses = expenses.filter((x) => x.id !== deletingExpenseId);
    saveExpenses();
    renderExpenses();
    closeModal(modalDeleteExpense);
    showToast("Transaksi telah dihapus!", "info");
    deletingExpenseId = null;
  });

  // Pencarian, Filter & Sorting Listeners
  expenseSearchInput?.addEventListener("input", renderExpenses);
  expenseFilterType?.addEventListener("change", renderExpenses);
  expenseFilterCategory?.addEventListener("change", renderExpenses);
  expenseSortSelect?.addEventListener("change", renderExpenses);
}

/* ====================================================================
   5. FITUR 2: BOOKMARK / LINK MANAGER
   ==================================================================== */

const BOOKMARK_STORAGE_KEY = "ifs24034-p3-bookmarks";

// Data awal (seed data) jika localStorage masih kosong
const DEFAULT_BOOKMARKS = [
  {
    id: "bm-sample-1",
    title: "W3Schools JavaScript Tutorial",
    url: "https://www.w3schools.com/js/default.asp",
    category: "Edukasi & Belajar",
    notes: "Bahan bacaan resmi modul Praktikum 3 PABWE tentang dasar JavaScript",
    createdAt: 1727400000000,
  },
  {
    id: "bm-sample-2",
    title: "MDN Web Docs — JavaScript",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    category: "Dokumentasi",
    notes: "Dokumentasi standar industri terlengkap untuk JS & Web APIs",
    createdAt: 1727450000000,
  },
  {
    id: "bm-sample-3",
    title: "Tailwind CSS Official Docs",
    url: "https://tailwindcss.com/docs",
    category: "Alat & Tools",
    notes: "Katalog utility class dan responsive design Tailwind",
    createdAt: 1727500000000,
  },
  {
    id: "bm-sample-4",
    title: "Portal CIS Institut Teknologi Del",
    url: "https://cis.del.ac.id",
    category: "Pekerjaan & Kuliah",
    notes: "Sistem informasi akademik perkuliahan Institut Teknologi Del",
    createdAt: 1727550000000,
  },
];

let bookmarks = loadBookmarks();
let editingBookmarkId = null;
let deletingBookmarkId = null;

// Elemen DOM Bookmark
const bookmarkForm = $("#bookmark-form");
const bookmarkTitleInput = $("#bookmark-title");
const bookmarkUrlInput = $("#bookmark-url");
const bookmarkUrlError = $("#bookmark-url-error");
const bookmarkCategorySelect = $("#bookmark-category");
const bookmarkNotesInput = $("#bookmark-notes");

const bookmarkSearchInput = $("#bookmark-search");
const bookmarkFilterCategory = $("#bookmark-filter-category");
const bookmarkSortSelect = $("#bookmark-sort");

const bookmarkListEl = $("#bookmark-list");
const bookmarkEmptyEl = $("#bookmark-empty");
const bookmarkCountBadge = $("#bookmark-count-badge");

// Elemen Modal Edit Bookmark
const modalEditBookmark = $("#modal-edit-bookmark");
const formEditBookmark = $("#form-edit-bookmark");
const editBookmarkTitle = $("#edit-bookmark-title");
const editBookmarkUrl = $("#edit-bookmark-url");
const editBookmarkUrlError = $("#edit-bookmark-url-error");
const editBookmarkCategory = $("#edit-bookmark-category");
const editBookmarkNotes = $("#edit-bookmark-notes");

// Elemen Modal Delete Bookmark
const modalDeleteBookmark = $("#modal-delete-bookmark");
const deleteBookmarkTitle = $("#delete-bookmark-title");
const deleteBookmarkUrl = $("#delete-bookmark-url");
const btnConfirmDeleteBookmark = $("#btn-confirm-delete-bookmark");

/**
 * Muat data bookmark dari localStorage
 * @returns {Array}
 */
function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(DEFAULT_BOOKMARKS));
      return [...DEFAULT_BOOKMARKS];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Gagal membaca data bookmark:", err);
    return [];
  }
}

/**
 * Simpan data bookmark ke localStorage
 */
function saveBookmarks() {
  try {
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (err) {
    console.error("Gagal menyimpan data bookmark:", err);
  }
}

/**
 * Validasi URL sederhana (diawali http:// atau https:// dan format web valid)
 * @param {string} urlString 
 * @returns {boolean}
 */
function isValidURL(urlString) {
  if (!urlString) return false;
  const trimmed = urlString.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Warna dan ikon kategori bookmark
 * @param {string} category 
 * @returns {{icon: string, color: string}}
 */
function getBookmarkCategoryMeta(category) {
  const metaMap = {
    "Edukasi & Belajar": { icon: "ti-book", color: "bg-emerald-100 text-emerald-800" },
    "Dokumentasi": { icon: "ti-file-text", color: "bg-sky-100 text-sky-800" },
    "Pekerjaan & Kuliah": { icon: "ti-briefcase", color: "bg-indigo-100 text-indigo-800" },
    "Alat & Tools": { icon: "ti-tools", color: "bg-amber-100 text-amber-800" },
    "Desain & UI/UX": { icon: "ti-palette", color: "bg-rose-100 text-rose-800" },
    "Hiburan & Media": { icon: "ti-movie", color: "bg-purple-100 text-purple-800" },
    "Lainnya": { icon: "ti-link", color: "bg-slate-100 text-slate-800" },
  };
  return metaMap[category] || { icon: "ti-link", color: "bg-slate-100 text-slate-800" };
}

/**
 * Salin teks URL ke papan klip (clipboard)
 * @param {string} text 
 */
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Tautan disalin ke papan klip!", "success");
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const tempInput = document.createElement("textarea");
  tempInput.value = text;
  tempInput.style.position = "fixed";
  tempInput.style.left = "-9999px";
  document.body.appendChild(tempInput);
  tempInput.focus();
  tempInput.select();
  try {
    document.execCommand("copy");
    showToast("Tautan disalin ke papan klip!", "success");
  } catch {
    showToast("Gagal menyalin tautan.", "error");
  }
  document.body.removeChild(tempInput);
}

/**
 * Filter, sort, dan render daftar bookmark ke DOM
 */
function renderBookmarks() {
  const query = (bookmarkSearchInput?.value || "").trim().toLowerCase();
  const filterCat = bookmarkFilterCategory?.value || "all";
  const sortBy = bookmarkSortSelect?.value || "newest";

  // Filter
  let filtered = bookmarks.filter((item) => {
    const matchQuery =
      (item.title || "").toLowerCase().includes(query) ||
      (item.url || "").toLowerCase().includes(query) ||
      (item.notes || "").toLowerCase().includes(query);
    const matchCat = filterCat === "all" || item.category === filterCat;
    return matchQuery && matchCat;
  });

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return a.createdAt - b.createdAt;
      case "title-asc":
        return (a.title || "").localeCompare(b.title || "", "id");
      case "title-desc":
        return (b.title || "").localeCompare(a.title || "", "id");
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  if (bookmarkCountBadge) {
    bookmarkCountBadge.textContent = `${filtered.length} tautan`;
  }

  const hasNoItems = filtered.length === 0;
  if (bookmarkEmptyEl) bookmarkEmptyEl.classList.toggle("hidden", !hasNoItems);
  if (bookmarkListEl) bookmarkListEl.classList.toggle("hidden", hasNoItems);

  if (!bookmarkListEl) return;
  bookmarkListEl.innerHTML = "";

  if (hasNoItems) return;

  filtered.forEach((item) => {
    const li = document.createElement("li");
    li.className =
      "group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white transition duration-150";
    li.dataset.id = item.id;

    const catMeta = getBookmarkCategoryMeta(item.category);

    // Kiri: Icon, Judul (Link), URL, Catatan
    const leftDiv = document.createElement("div");
    leftDiv.className = "flex items-start gap-3 flex-1 min-w-0";

    const iconDiv = document.createElement("div");
    iconDiv.className = `w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${catMeta.color}`;
    iconDiv.innerHTML = `<i class="ti ${catMeta.icon}"></i>`;

    const infoDiv = document.createElement("div");
    infoDiv.className = "flex-1 min-w-0";

    // Link Judul membuka tab baru
    const linkTitle = document.createElement("a");
    linkTitle.href = item.url;
    linkTitle.target = "_blank";
    linkTitle.rel = "noopener noreferrer";
    linkTitle.className =
      "font-semibold text-slate-900 hover:text-indigo-600 transition inline-flex items-center gap-1.5 text-sm group/link";
    linkTitle.innerHTML = `<span>${escapeHTML(item.title)}</span><i class="ti ti-external-link text-slate-400 group-hover/link:text-indigo-600 text-xs"></i>`;

    // URL teks
    const urlP = document.createElement("p");
    urlP.className = "text-xs text-indigo-700 truncate font-mono mt-0.5";
    urlP.textContent = item.url;

    // Catatan jika ada
    if (item.notes) {
      const notesP = document.createElement("p");
      notesP.className = "text-xs text-slate-500 mt-1 line-clamp-2";
      notesP.textContent = item.notes;
      infoDiv.append(linkTitle, urlP, notesP);
    } else {
      infoDiv.append(linkTitle, urlP);
    }

    // Badge kategori
    const badgeSpan = document.createElement("span");
    badgeSpan.className = `inline-block text-[11px] px-2 py-0.5 rounded-md font-semibold mt-1.5 ${catMeta.color}`;
    badgeSpan.textContent = item.category;
    infoDiv.appendChild(badgeSpan);

    leftDiv.append(iconDiv, infoDiv);

    // Kanan: Tombol Buka, Salin, Ubah, Hapus
    const rightDiv = document.createElement("div");
    rightDiv.className =
      "flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100";

    // Buka Tautan
    const openBtn = document.createElement("a");
    openBtn.href = item.url;
    openBtn.target = "_blank";
    openBtn.rel = "noopener noreferrer";
    openBtn.className =
      "inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 text-xs font-semibold transition";
    openBtn.innerHTML = '<i class="ti ti-external-link"></i><span>Buka</span>';

    // Salin Tautan
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition";
    copyBtn.innerHTML = '<i class="ti ti-copy"></i><span class="hidden md:inline">Salin</span>';
    copyBtn.title = "Salin URL ke papan klip";
    copyBtn.addEventListener("click", () => copyToClipboard(item.url));

    // Tombol Ubah
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition";
    editBtn.innerHTML = '<i class="ti ti-pencil"></i><span class="hidden md:inline">Ubah</span>';
    editBtn.addEventListener("click", () => openEditBookmarkModal(item.id));

    // Tombol Hapus
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition";
    deleteBtn.innerHTML = '<i class="ti ti-trash"></i><span class="hidden md:inline">Hapus</span>';
    deleteBtn.addEventListener("click", () => openDeleteBookmarkModal(item.id));

    rightDiv.append(openBtn, copyBtn, editBtn, deleteBtn);

    li.append(leftDiv, rightDiv);
    bookmarkListEl.appendChild(li);
  });
}

/**
 * Buka modal ubah bookmark
 * @param {string} id 
 */
function openEditBookmarkModal(id) {
  const item = bookmarks.find((x) => x.id === id);
  if (!item) return;

  editingBookmarkId = id;
  editBookmarkTitle.value = item.title;
  editBookmarkUrl.value = item.url;
  editBookmarkCategory.value = item.category;
  editBookmarkNotes.value = item.notes || "";
  if (editBookmarkUrlError) editBookmarkUrlError.classList.add("hidden");

  openModal(modalEditBookmark);
  editBookmarkTitle.focus();
}

/**
 * Buka modal konfirmasi hapus bookmark
 * @param {string} id 
 */
function openDeleteBookmarkModal(id) {
  const item = bookmarks.find((x) => x.id === id);
  if (!item) return;

  deletingBookmarkId = id;
  deleteBookmarkTitle.textContent = item.title;
  deleteBookmarkUrl.textContent = item.url;

  openModal(modalDeleteBookmark);
}

// Inisialisasi Event Handlers untuk Bookmark
function initBookmarkEvents() {
  // Tambah Bookmark
  bookmarkForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = (bookmarkTitleInput?.value || "").trim();
    let url = (bookmarkUrlInput?.value || "").trim();
    const category = bookmarkCategorySelect?.value || "Lainnya";
    const notes = (bookmarkNotesInput?.value || "").trim();

    if (!title) {
      showToast("Nama tautan wajib diisi!", "error");
      return;
    }

    if (!isValidURL(url)) {
      if (bookmarkUrlError) {
        bookmarkUrlError.textContent = "URL harus diawali http:// atau https:// dan memiliki format yang valid.";
        bookmarkUrlError.classList.remove("hidden");
      }
      showToast("URL website tidak valid!", "error");
      bookmarkUrlInput?.focus();
      return;
    }
    if (bookmarkUrlError) bookmarkUrlError.classList.add("hidden");

    const newBookmark = {
      id: "bm-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      title,
      url,
      category,
      notes,
      createdAt: Date.now(),
    };

    bookmarks.unshift(newBookmark);
    saveBookmarks();
    renderBookmarks();

    bookmarkForm.reset();
    showToast("Bookmark berhasil disimpan!", "success");
  });

  // Simpan Perubahan Edit Bookmark
  formEditBookmark?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!editingBookmarkId) return;

    const title = (editBookmarkTitle?.value || "").trim();
    const url = (editBookmarkUrl?.value || "").trim();
    const category = editBookmarkCategory?.value || "Lainnya";
    const notes = (editBookmarkNotes?.value || "").trim();

    if (!title) {
      showToast("Nama tautan wajib diisi!", "error");
      return;
    }

    if (!isValidURL(url)) {
      if (editBookmarkUrlError) {
        editBookmarkUrlError.textContent = "URL harus diawali http:// atau https:// dan valid.";
        editBookmarkUrlError.classList.remove("hidden");
      }
      showToast("URL tidak valid!", "error");
      return;
    }
    if (editBookmarkUrlError) editBookmarkUrlError.classList.add("hidden");

    const item = bookmarks.find((x) => x.id === editingBookmarkId);
    if (item) {
      item.title = title;
      item.url = url;
      item.category = category;
      item.notes = notes;

      saveBookmarks();
      renderBookmarks();
      closeModal(modalEditBookmark);
      showToast("Bookmark berhasil diperbarui!", "success");
    }
    editingBookmarkId = null;
  });

  // Konfirmasi Hapus Bookmark
  btnConfirmDeleteBookmark?.addEventListener("click", () => {
    if (!deletingBookmarkId) return;
    bookmarks = bookmarks.filter((x) => x.id !== deletingBookmarkId);
    saveBookmarks();
    renderBookmarks();
    closeModal(modalDeleteBookmark);
    showToast("Bookmark berhasil dihapus!", "info");
    deletingBookmarkId = null;
  });

  // Search & Filter Listeners
  bookmarkSearchInput?.addEventListener("input", renderBookmarks);
  bookmarkFilterCategory?.addEventListener("change", renderBookmarks);
  bookmarkSortSelect?.addEventListener("change", renderBookmarks);
}

/* ====================================================================
   6. FITUR 3: KUIS INTERAKTIF (QUIZ APP)
   ==================================================================== */

const QUIZ_STORAGE_KEY = "ifs24034-p3-quiz-highscore";

/**
 * Array of Object: Daftar Soal Kuis PABWE & JavaScript Modern
 */
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "Manakah metode JavaScript yang tepat untuk memilih elemen DOM pertama yang cocok dengan selektor CSS?",
    options: [
      "document.getElementById()",
      "document.querySelector()",
      "document.getElementsByClassName()",
      "document.querySelectorAll()",
    ],
    answer: 1,
    explanation:
      "document.querySelector() mengembalikan elemen pertama dalam dokumen yang cocok dengan selektor CSS tertentu, sedangkan querySelectorAll mengembalikan NodeList dari semua elemen yang cocok.",
  },
  {
    id: 2,
    question: "Pernyataan mana yang BENAR mengenai perbedaan antara 'let' dan 'const' di JavaScript modern (ES6)?",
    options: [
      "'let' memiliki scope fungsi, sedangkan 'const' memiliki scope global",
      "'const' tidak mengizinkan penugasan ulang (reassignment) nilai variabel, sedangkan 'let' mengizinkannya",
      "'let' dan 'const' adalah sinonim persis dan tidak memiliki perbedaan fungsi",
      "Nilai objek yang dideklarasikan dengan 'const' propertinya tidak dapat diubah sama sekali",
    ],
    answer: 1,
    explanation:
      "Variabel yang dideklarasikan dengan 'const' tidak dapat di-reassign ke nilai atau referensi baru, namun untuk object/array, properti atau elemen di dalamnya tetap dapat dimutasi.",
  },
  {
    id: 3,
    question: "Metode apa yang digunakan untuk mengubah objek JavaScript menjadi representasi string JSON agar dapat disimpan di localStorage?",
    options: [
      "JSON.parse()",
      "JSON.stringify()",
      "JSON.toObject()",
      "localStorage.serialize()",
    ],
    answer: 1,
    explanation:
      "JSON.stringify() mengonversi objek/array JavaScript menjadi string format JSON. Sebaliknya, JSON.parse() mengonversi string JSON kembali menjadi objek JavaScript.",
  },
  {
    id: 4,
    question: "Karakteristik utama dari penyimpanan data pada 'localStorage' di browser adalah:",
    options: [
      "Data akan otomatis terhapus saat tab browser ditutup",
      "Data hanya tersimpan selama 24 jam sebelum kedaluwarsa",
      "Data tetap bertahan bahkan setelah halaman di-refresh atau browser ditutup hingga dihapus secara eksplisit",
      "Data langsung tersinkronisasi ke server database tanpa perantara API",
    ],
    answer: 2,
    explanation:
      "localStorage menyimpan data tanpa waktu kedaluwarsa (persistent), berbeda dengan sessionStorage yang datanya hilang saat tab/sesi ditutup.",
  },
  {
    id: 5,
    question: "Bagaimana cara yang benar untuk mendengarkan event klik pada sebuah tombol tanpa menggunakan atribut HTML inline (seperti onclick)?",
    options: [
      "button.listenClick(callback)",
      "button.attach('click', callback)",
      "button.addEventListener('click', callback)",
      "button.setEventListener(callback)",
    ],
    answer: 2,
    explanation:
      "button.addEventListener('click', callback) adalah standar web modern untuk mendaftarkan event handler, memisahkan struktur HTML dari perilaku JavaScript (Separation of Concerns).",
  },
  {
    id: 6,
    question: "Metode Array mana yang mengembalikan array baru berisi elemen-elemen yang lolos kondisi pengujian logika?",
    options: [
      "Array.prototype.forEach()",
      "Array.prototype.filter()",
      "Array.prototype.map()",
      "Array.prototype.find()",
    ],
    answer: 1,
    explanation:
      "filter() menghasilkan array baru yang hanya memuat elemen-elemen di mana fungsi pengujian mengembalikan nilai truthy.",
  },
  {
    id: 7,
    question: "Tag HTML5 manakah yang paling tepat digunakan untuk membungkus navigasi utama dari sebuah halaman web secara semantik?",
    options: [
      "<section>",
      "<aside>",
      "<nav>",
      "<menuitem>",
    ],
    answer: 2,
    explanation:
      "Tag <nav> secara semantik menandai blok navigasi yang berisi tautan-tautan utama ke halaman atau bagian lain dalam aplikasi web.",
  },
  {
    id: 8,
    question: "Pada Single Page Application (SPA), bagaimana interaktivitas halaman diperbarui tanpa reload seluruh dokumen?",
    options: [
      "Melakukan restart web server setiap ada input",
      "Memanipulasi Document Object Model (DOM) secara dinamis menggunakan JavaScript",
      "Mengganti file .html secara langsung di direktori sistem operasi klien",
      "Memaksa browser mengunduh ulang seluruh kode sumber setiap detik",
    ],
    answer: 1,
    explanation:
      "SPA memperbarui antarmuka pengguna secara mulus dengan memanipulasi pohon DOM (Document Object Model) via JavaScript, mengubah elemen sesuai state aplikasi tanpa memuat ulang seluruh halaman.",
  },
];

// State Kuis
let quizCurrentIndex = 0;
let quizScore = 0;
let quizUserAnswers = []; // Riwayat jawaban pengguna
let quizAnswered = false; // Flag apakah soal aktif sudah dijawab

// Elemen DOM Kuis
const quizScreenStart = $("#quiz-screen-start");
const quizScreenQuestion = $("#quiz-screen-question");
const quizScreenResult = $("#quiz-screen-result");

const quizHighScoreEl = $("#quiz-high-score");
const quizStartBtn = $("#quiz-start-btn");

const quizQuestionCounter = $("#quiz-question-counter");
const quizScoreLive = $("#quiz-score-live");
const quizProgressBar = $("#quiz-progress-bar");
const quizQuestionText = $("#quiz-question-text");
const quizOptionsContainer = $("#quiz-options-container");
const quizFeedbackBox = $("#quiz-feedback-box");
const quizFeedbackIcon = $("#quiz-feedback-icon");
const quizFeedbackTitle = $("#quiz-feedback-title");
const quizFeedbackExplanation = $("#quiz-feedback-explanation");
const quizNextBtn = $("#quiz-next-btn");
const quizQuitBtn = $("#quiz-quit-btn");

const quizResultBadgeIcon = $("#quiz-result-badge-icon");
const quizNewRecordTag = $("#quiz-new-record-tag");
const quizResultTitle = $("#quiz-result-title");
const quizResultMessage = $("#quiz-result-message");
const quizResultScore = $("#quiz-result-score");
const quizResultPercentage = $("#quiz-result-percentage");
const quizResultCorrect = $("#quiz-result-correct");
const quizResultWrong = $("#quiz-result-wrong");
const quizRestartBtn = $("#quiz-restart-btn");
const quizResetRecordBtn = $("#quiz-reset-record-btn");
const quizReviewList = $("#quiz-review-list");

/**
 * Ambil skor tertinggi dari localStorage
 * @returns {number|null}
 */
function getQuizHighScore() {
  const v = localStorage.getItem(QUIZ_STORAGE_KEY);
  return v !== null ? Number(v) : null;
}

/**
 * Tampilkan skor tertinggi pada UI
 */
function updateQuizHighScoreDisplay() {
  const high = getQuizHighScore();
  if (quizHighScoreEl) {
    if (high === null) {
      quizHighScoreEl.textContent = "— Belum ada";
    } else {
      quizHighScoreEl.textContent = `${high} / ${QUIZ_QUESTIONS.length} (${Math.round((high / QUIZ_QUESTIONS.length) * 100)}%)`;
    }
  }
}

/**
 * Memulai kuis dari awal
 */
function startQuiz() {
  quizCurrentIndex = 0;
  quizScore = 0;
  quizUserAnswers = [];
  quizAnswered = false;

  quizScreenStart?.classList.add("hidden");
  quizScreenResult?.classList.add("hidden");
  quizScreenQuestion?.classList.remove("hidden");

  renderCurrentQuestion();
}

/**
 * Render pertanyaan aktif ke layar
 */
function renderCurrentQuestion() {
  quizAnswered = false;
  const q = QUIZ_QUESTIONS[quizCurrentIndex];
  if (!q) return;

  // Update counter & progress bar
  const total = QUIZ_QUESTIONS.length;
  const currentNum = quizCurrentIndex + 1;
  const progressPercent = Math.round(((currentNum - 1) / total) * 100);

  if (quizQuestionCounter) {
    quizQuestionCounter.textContent = `Pertanyaan ${currentNum} dari ${total}`;
  }
  if (quizScoreLive) {
    quizScoreLive.textContent = `Skor Saat Ini: ${quizScore}`;
  }
  if (quizProgressBar) {
    quizProgressBar.style.width = `${progressPercent}%`;
  }
  if (quizQuestionText) {
    quizQuestionText.textContent = `${currentNum}. ${q.question}`;
  }

  // Sembunyikan box feedback dan disable tombol next
  if (quizFeedbackBox) quizFeedbackBox.classList.add("hidden");
  if (quizNextBtn) {
    quizNextBtn.disabled = true;
    quizNextBtn.innerHTML =
      currentNum === total
        ? '<span>Lihat Hasil Akhir</span><i class="ti ti-trophy"></i>'
        : '<span>Lanjut Soal Berikutnya</span><i class="ti ti-arrow-right"></i>';
  }

  // Render opsi jawaban
  if (!quizOptionsContainer) return;
  quizOptionsContainer.innerHTML = "";

  const optionLabels = ["A", "B", "C", "D"];

  q.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "quiz-option-btn w-full flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-left transition duration-150 group";
    btn.dataset.index = idx;

    const labelBadge = document.createElement("span");
    labelBadge.className =
      "quiz-option-letter w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-sky-600 group-hover:text-white text-slate-700 font-display font-bold text-sm flex items-center justify-center shrink-0 transition";
    labelBadge.textContent = optionLabels[idx] || `${idx + 1}`;

    const textSpan = document.createElement("span");
    textSpan.className = "flex-1 text-sm font-medium text-slate-800 leading-snug";
    textSpan.textContent = optText;

    const checkIcon = document.createElement("i");
    checkIcon.className = "quiz-check-icon ti ti-circle text-slate-300 text-lg shrink-0";

    btn.append(labelBadge, textSpan, checkIcon);

    btn.addEventListener("click", () => handleSelectOption(idx));
    quizOptionsContainer.appendChild(btn);
  });
}

/**
 * Handle ketika pengguna memilih salah satu opsi
 * @param {number} selectedIndex 
 */
function handleSelectOption(selectedIndex) {
  if (quizAnswered) return;
  quizAnswered = true;

  const q = QUIZ_QUESTIONS[quizCurrentIndex];
  const isCorrect = selectedIndex === q.answer;

  if (isCorrect) {
    quizScore += 1;
  }

  // Rekam riwayat jawaban
  quizUserAnswers.push({
    questionId: q.id,
    questionText: q.question,
    selectedIndex,
    selectedText: q.options[selectedIndex],
    correctIndex: q.answer,
    correctText: q.options[q.answer],
    isCorrect,
    explanation: q.explanation,
  });

  // Update live score display
  if (quizScoreLive) {
    quizScoreLive.textContent = `Skor Saat Ini: ${quizScore}`;
  }

  // Tampilkan visual pada semua tombol opsi
  const allOptionBtns = $all(".quiz-option-btn");
  allOptionBtns.forEach((btn) => {
    btn.disabled = true;
    const btnIdx = Number(btn.dataset.index);
    const letter = btn.querySelector(".quiz-option-letter");
    const checkIcon = btn.querySelector(".quiz-check-icon");

    if (btnIdx === q.answer) {
      // Opsi Benar
      btn.className =
        "w-full flex items-center gap-3.5 p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 text-left transition font-semibold";
      if (letter) letter.className = "w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0";
      if (checkIcon) checkIcon.className = "ti ti-circle-check-filled text-emerald-600 text-xl shrink-0";
    } else if (btnIdx === selectedIndex && !isCorrect) {
      // Opsi Salah yang dipilih pengguna
      btn.className =
        "w-full flex items-center gap-3.5 p-4 rounded-xl border-2 border-rose-400 bg-rose-50 text-rose-900 text-left transition font-semibold";
      if (letter) letter.className = "w-8 h-8 rounded-lg bg-rose-600 text-white font-bold text-sm flex items-center justify-center shrink-0";
      if (checkIcon) checkIcon.className = "ti ti-circle-x-filled text-rose-600 text-xl shrink-0";
    } else {
      // Opsi lain yang tidak dipilih
      btn.className = "w-full flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-400 text-left opacity-60";
    }
  });

  // Tampilkan box feedback penjelasan
  if (quizFeedbackBox) {
    quizFeedbackBox.classList.remove("hidden");
    if (isCorrect) {
      quizFeedbackBox.className = "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm flex items-start gap-3";
      if (quizFeedbackIcon) quizFeedbackIcon.className = "ti ti-circle-check text-emerald-600 text-xl shrink-0 mt-0.5";
      if (quizFeedbackTitle) {
        quizFeedbackTitle.className = "font-bold text-emerald-900 mb-1";
        quizFeedbackTitle.textContent = "Jawaban Anda Benar!";
      }
    } else {
      quizFeedbackBox.className = "rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm flex items-start gap-3";
      if (quizFeedbackIcon) quizFeedbackIcon.className = "ti ti-circle-x text-rose-600 text-xl shrink-0 mt-0.5";
      if (quizFeedbackTitle) {
        quizFeedbackTitle.className = "font-bold text-rose-900 mb-1";
        quizFeedbackTitle.textContent = "Jawaban Anda Kurang Tepat.";
      }
    }

    if (quizFeedbackExplanation) {
      quizFeedbackExplanation.textContent = q.explanation;
    }
  }

  // Aktifkan tombol Lanjut
  if (quizNextBtn) {
    quizNextBtn.disabled = false;
    quizNextBtn.focus();
  }
}

/**
 * Pindah ke pertanyaan berikutnya atau tampilkan hasil jika sudah selesai
 */
function nextQuestion() {
  quizCurrentIndex += 1;
  if (quizCurrentIndex < QUIZ_QUESTIONS.length) {
    renderCurrentQuestion();
  } else {
    showQuizResult();
  }
}

/**
 * Tampilkan layar hasil akhir kuis
 */
function showQuizResult() {
  quizScreenQuestion?.classList.add("hidden");
  quizScreenResult?.classList.remove("hidden");

  const total = QUIZ_QUESTIONS.length;
  const percentage = Math.round((quizScore / total) * 100);
  const wrongCount = total - quizScore;

  if (quizResultScore) quizResultScore.textContent = `${quizScore} / ${total}`;
  if (quizResultPercentage) quizResultPercentage.textContent = `${percentage}%`;
  if (quizResultCorrect) quizResultCorrect.textContent = String(quizScore);
  if (quizResultWrong) quizResultWrong.textContent = String(wrongCount);

  // Periksa High Score
  const prevHighScore = getQuizHighScore();
  let isNewRecord = false;

  if (prevHighScore === null || quizScore > prevHighScore) {
    isNewRecord = true;
    localStorage.setItem(QUIZ_STORAGE_KEY, String(quizScore));
    updateQuizHighScoreDisplay();
  }

  if (quizNewRecordTag) {
    quizNewRecordTag.classList.toggle("hidden", !isNewRecord);
  }

  // Pesan dan styling hasil berdasarkan skor
  if (quizResultBadgeIcon) {
    if (percentage >= 80) {
      quizResultBadgeIcon.className = "w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl shadow-md bg-emerald-100 text-emerald-600";
      quizResultBadgeIcon.innerHTML = '<i class="ti ti-trophy"></i>';
      if (quizResultTitle) quizResultTitle.textContent = "Luar Biasa!";
      if (quizResultMessage) quizResultMessage.textContent = "Pemahaman Anda terhadap konsep JavaScript & web modern sangat baik.";
    } else if (percentage >= 50) {
      quizResultBadgeIcon.className = "w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl shadow-md bg-amber-100 text-amber-600";
      quizResultBadgeIcon.innerHTML = '<i class="ti ti-thumb-up"></i>';
      if (quizResultTitle) quizResultTitle.textContent = "Cukup Bagus!";
      if (quizResultMessage) quizResultMessage.textContent = "Hasil yang baik, namun masih ada beberapa konsep yang perlu diperdalam.";
    } else {
      quizResultBadgeIcon.className = "w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl shadow-md bg-rose-100 text-rose-600";
      quizResultBadgeIcon.innerHTML = '<i class="ti ti-book"></i>';
      if (quizResultTitle) quizResultTitle.textContent = "Perlu Belajar Lagi";
      if (quizResultMessage) quizResultMessage.textContent = "Jangan berkecil hati! Pelajari kembali materi praktikum dan ulangi kuis.";
    }
  }

  // Render Ulasan Soal (Review)
  if (quizReviewList) {
    quizReviewList.innerHTML = "";
    quizUserAnswers.forEach((ans, idx) => {
      const card = document.createElement("div");
      card.className = `p-4 rounded-xl border ${
        ans.isCorrect ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"
      }`;

      card.innerHTML = `
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <p class="font-bold text-sm text-slate-900">${idx + 1}. ${escapeHTML(ans.questionText)}</p>
          <span class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
            ans.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
          }">
            <i class="ti ${ans.isCorrect ? "ti-check" : "ti-x"}"></i> ${ans.isCorrect ? "Benar" : "Salah"}
          </span>
        </div>
        <p class="text-xs text-slate-700">
          <strong>Jawaban Anda:</strong> <span class="${ans.isCorrect ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold line-through"}">${escapeHTML(ans.selectedText)}</span>
        </p>
        ${
          !ans.isCorrect
            ? `<p class="text-xs text-emerald-800 mt-0.5 font-medium"><strong>Kunci Jawaban:</strong> ${escapeHTML(ans.correctText)}</p>`
            : ""
        }
        <p class="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">${escapeHTML(ans.explanation)}</p>
      `;

      quizReviewList.appendChild(card);
    });
  }
}

// Inisialisasi Event Handlers untuk Kuis
function initQuizEvents() {
  updateQuizHighScoreDisplay();

  quizStartBtn?.addEventListener("click", startQuiz);
  quizNextBtn?.addEventListener("click", nextQuestion);
  quizRestartBtn?.addEventListener("click", startQuiz);

  quizQuitBtn?.addEventListener("click", () => {
    if (confirm("Apakah Anda yakin ingin membatalkan kuis yang sedang berjalan?")) {
      quizScreenQuestion?.classList.add("hidden");
      quizScreenStart?.classList.remove("hidden");
    }
  });

  quizResetRecordBtn?.addEventListener("click", () => {
    if (confirm("Hapus rekor skor tertinggi yang tersimpan di browser ini?")) {
      localStorage.removeItem(QUIZ_STORAGE_KEY);
      updateQuizHighScoreDisplay();
      if (quizNewRecordTag) quizNewRecordTag.classList.add("hidden");
      showToast("Rekor kuis berhasil direset.", "info");
    }
  });
}

/* ====================================================================
   7. INISIALISASI SELURUH APLIKASI
   ==================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Inisialisasi modal listeners
  initModalListeners();

  // 2. Inisialisasi tab switcher
  switchTab(savedTab);

  // 3. Inisialisasi Expense Tracker
  initExpenseEvents();
  renderExpenses();

  // 4. Inisialisasi Bookmark Manager
  initBookmarkEvents();
  renderBookmarks();

  // 5. Inisialisasi Kuis Interaktif
  initQuizEvents();
});

