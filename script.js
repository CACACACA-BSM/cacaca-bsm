// ===================================================================================
// ==================== SCRIPT.JS - VERSI FINAL DAN LENGKAP ====================
// ===================================================================================

// --- CONFIGURATION ---
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxn-a_yqBukHWBvrQsDs937DHt_sAJ72rR5WXOuXOnTmF_rILrsIegiY62707pOeKl8uA/exec";
const MANPOWER_HEADERS = [
  "NRP",
  "NAME",
  "GENDER",
  "COMPANY",
  "MARITAL STATUS",
  "RELIGION",
  "DEPARTMENT",
  "SECTION",
  "POSITION",
  "GRADE",
  "PLACE OF BIRTH",
  "DATE OF BIRTH",
  "EDUCATION",
  "MESS",
  "POH",
  "HIRING DATE",
  "EMAIL",
  "PHONE NUMBER",
  "EMERGENCY NUMBER",
  "KTP NUMBER",
  "NPWP",
  "ACCOUNT NUMBER",
  "BANK NAME",
  "ACCOUNT HOLDER NAME",
  "LEAVE PERIOD",
  "STATUS POH",
  "ADDRESS",
  "VILLAGE",
  "SUB-DISTRICT",
  "CITY",
  "PROVINCE",
  "INSURANCE PREMIUM",
  "DAR",
  "UDL",
  "BLOOD TYPE",
  "BPJS EMPLOYMENT",
  "BPJS HEALTH",
  "PRIVATE INSURANCE",
  "INSURANCE PROVIDER",
  "MCU EXPIRATION",
  "SHIRT SIZE",
  "PANTS SIZE",
  "SHOE SIZE",
  "KTP FAMILY NUMBER",
  "SUPERVISOR NRP",
  "STATUS",
];
const SP_HEADERS = [
  "ID DOKUMEN",
  "NRP",
  "NAME",
  "COMPANY",
  "DEPARTMENT",
  "POSITION",
  "TANGGAL KEJADIAN",
  "WAKTU KEJADIAN",
  "SANKSI",
  "JENIS",
  "LOKASI",
  "URAIAN",
  "MINEPERMIT",
  "SIMPER",
  "MASA GROUNDED",
  "JADWAL GROUNDED",
  "JADWAL DIRUMAHKAN",
  "STATUS",
  "DIBUAT OLEH",
  "PADA TANGGAL",
];
const LEAVE_HEADERS = [
  "NRP",
  "STATUS",
  "ID DOKUMEN",
  "TANGGAL PENGAJUAN",
  "CUTI ISTIRAHAT",
  "CUTI BESAR",
  "CUTI SEMINAR",
  "CUTI TAHUNAN",
  "CUTI LAPANGAN",
  "NAMA PEKERJA",
  "DEPT",
  "JABATAN",
  "POSISI",
  "CATATAN",
  "ATASAN",
  "POH",
  "TANGGAL BERANGKAT",
  "TANGGAL KEMBALI",
  "PERUSAHAAN",
  "TANGGAL APPROVED",
  "TANGGAL CONFIRMED",
];

// --- GLOBAL STATE ---
let appData = {
  manpower: [],
  suratPeringatan: [],
  leaveApplication: [],
  recruitment: {},
  activityLog: [],
};
let charts = {};

// --- STATE UNTUK MANPOWER PAGE ---
let filteredManpower = [];
let manpowerCurrentPage = 1;
const manpowerRowsPerPage = 15;

// --- STATE UNTUK RECRUITMENT PAGE ---
let recruitmentPageState = {};
let activeRecruitmentSheet = "Pelamar_Masuk";
const recruitmentRowsPerPage = 10;
let selectedApplicants = new Set();

// --- STATE UNTUK DASHBOARD ---
let dashboardDateRange = { start: null, end: null };

// --- UTILITIES ---
function showToast(message, type = "success") {
  const toast = document.getElementById("toast-notification");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function exportToExcel(data, fileName) {
  if (data.length === 0) {
    showToast("Tidak ada data untuk diekspor.", "error");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, fileName);
}

// --- PAGE & TAB NAVIGATION ---
const pageTitle = document.getElementById("page-title");
function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach((page) => page.classList.add("hidden"));
  document.getElementById(pageId + "-page").classList.remove("hidden");
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active-nav");
    link.classList.add("sidebar-link");
  });
  const activeLink = document.querySelector(
    `.nav-link[onclick="showPage('${pageId}')"]`
  );
  activeLink.classList.add("active-nav");
  activeLink.classList.remove("sidebar-link");
  const titleText = activeLink.querySelector(".nav-text").textContent;
  pageTitle.textContent = titleText;
  if (pageId === "dashboard") switchDashboardTab("personal");
  if (pageId === "manpower" && appData.manpower.length === 0)
    fetchManpowerData();
  if (pageId === "surat_peringatan" && appData.suratPeringatan.length === 0)
    fetchSPData();
  if (pageId === "leave_application" && appData.leaveApplication.length === 0)
    fetchLeaveData();
  if (pageId === "recruitment" && Object.keys(appData.recruitment).length === 0)
    showRecruitmentTab("Pelamar_Masuk");
  if (pageId === "activity_log" && appData.activityLog.length === 0)
    fetchActivityLog();
}

function switchDashboardTab(tabId) {
  document
    .querySelectorAll(".dashboard-content")
    .forEach((c) => c.classList.add("hidden"));
  document
    .getElementById(`dashboard-${tabId}-content`)
    .classList.remove("hidden");
  document.querySelectorAll(".dashboard-tab").forEach((t) => {
    t.classList.remove("active");
    if (t.getAttribute("onclick").includes(tabId)) t.classList.add("active");
  });
  if (tabId === "personal") {
    if (appData.manpower.length === 0)
      fetchManpowerData().then(renderPersonalDashboardCharts);
    else renderPersonalDashboardCharts();
  }
  if (tabId === "rekrutmen") {
    if (Object.keys(appData.recruitment).length === 0)
      fetchAllRecruitmentData().then(renderRecruitmentDashboardCharts);
    else renderRecruitmentDashboardCharts();
  }
  if (tabId === "sp") {
    if (appData.suratPeringatan.length === 0)
      fetchSPData().then(renderSPDashboardCharts);
    else renderSPDashboardCharts();
  }
}

function switchDetailTab(event, tabId) {
  event.preventDefault();
  document
    .querySelectorAll(".detail-tab-content")
    .forEach((c) => c.classList.add("hidden"));
  document.getElementById(tabId + "-content").classList.remove("hidden");
  document.querySelectorAll(".detail-tab").forEach((t) => {
    t.classList.remove("detail-tab-active", "text-gray-500");
    if (t.getAttribute("onclick").includes(tabId)) {
      t.classList.add("detail-tab-active");
    } else {
      t.classList.add("text-gray-500");
    }
  });
  if (tabId === "family-data") {
    const nrp = document.getElementById("edit-nrp").value;
    fetchFamilyData(nrp);
  }
}

// --- MODAL LOGIC ---
const modalBackdrop = document.getElementById("modal-backdrop");
function openModal(modalId) {
  document.getElementById(modalId)?.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
}
function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add("hidden");
  modalBackdrop.classList.add("hidden");
}
modalBackdrop.addEventListener(
  "click",
  () =>
    document
      .querySelectorAll(".modal")
      .forEach((m) => m.classList.add("hidden")) ||
    modalBackdrop.classList.add("hidden")
);

// --- DATA FETCHING ---
function showLoader(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="100%" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>`;
}

async function apiCall(params, options = {}) {
  const url = new URL(WEB_APP_URL);
  Object.keys(params).forEach((key) =>
    url.searchParams.append(key, params[key])
  );
  try {
    const response = await fetch(url, options);
    if (
      response.type === "opaque" ||
      (response.redirected && options.method === "POST")
    )
      return { success: true };
    if (!response.ok)
      throw new Error(`Network response was not ok: ${response.statusText}`);
    return response.json();
  } catch (error) {
    if (options.method === "POST" && error.name === "TypeError")
      return { success: true };
    throw error;
  }
}

async function fetchManpowerData() {
  showLoader("manpower-table-body");
  try {
    const result = await apiCall({ action: "getManpowerData" });
    if (result.success) {
      appData.manpower = result.data;
      manpowerCurrentPage = 1;
      populateDepartmentFilter();
      renderManpowerPage();
    } else throw new Error(result.error);
  } catch (error) {
    document.getElementById(
      "manpower-table-body"
    ).innerHTML = `<tr><td colspan="7" class="text-center p-4 text-red-500">Gagal memuat data: ${error.message}</td></tr>`;
  }
}

async function fetchSPData() {
  showLoader("sp-table-body");
  try {
    const result = await apiCall({ action: "getSPData" });
    if (result.success) {
      appData.suratPeringatan = result.data;
      renderSPTable();
    } else throw new Error(result.error);
  } catch (error) {
    document.getElementById(
      "sp-table-body"
    ).innerHTML = `<tr><td colspan="8" class="text-center p-4 text-red-500">Gagal memuat data: ${error.message}</td></tr>`;
  }
}

async function fetchLeaveData() {
  showLoader("leave-table-body");
  try {
    const result = await apiCall({ action: "getLeaveData" });
    if (result.success) {
      appData.leaveApplication = result.data;
      renderLeaveTable();
    } else throw new Error(result.error);
  } catch (error) {
    document.getElementById(
      "leave-table-body"
    ).innerHTML = `<tr><td colspan="7" class="text-center p-4 text-red-500">Gagal memuat data: ${error.message}</td></tr>`;
  }
}

async function fetchFamilyData(nrp) {
  showLoader("family-table-body");
  try {
    const result = await apiCall({ action: "getFamilyData" });
    if (result.success) {
      const familyMembers = result.data.filter((member) => member.NRP == nrp);
      renderFamilyTable(familyMembers);
    } else throw new Error(result.error);
  } catch (error) {
    document.getElementById(
      "family-table-body"
    ).innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Gagal memuat data keluarga: ${error.message}</td></tr>`;
  }
}

async function fetchRecruitmentData(sheetName) {
  try {
    const result = await apiCall({
      action: "getRecruitmentData",
      sheet: sheetName,
    });
    if (result.success) {
      appData.recruitment[sheetName] = result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToast(
      `Gagal memuat data untuk ${sheetName}: ${error.message}`,
      "error"
    );
    appData.recruitment[sheetName] = [];
  }
}

async function fetchAllRecruitmentData() {
  const sheetsToFetch = [
    "Pelamar_Masuk",
    "Proses_Pelamar",
    "Kandidat_Terpilih",
    "Pelamar_Final",
  ];
  const promises = sheetsToFetch.map((sheetName) => {
    if (!appData.recruitment[sheetName]) {
      return apiCall({ action: "getRecruitmentData", sheet: sheetName })
        .then((result) => {
          if (result.success) appData.recruitment[sheetName] = result.data;
        })
        .catch((e) => {
          console.error(`Failed to fetch ${sheetName}:`, e);
          appData.recruitment[sheetName] = [];
        });
    }
    return Promise.resolve();
  });
  await Promise.all(promises);
}

async function fetchActivityLog() {
  showLoader("activity-log-table-body");
  try {
    const result = await apiCall({ action: "getActivityLog" });
    if (result.success) {
      appData.activityLog = result.data;
      renderActivityLogTable();
    } else throw new Error(result.error);
  } catch (error) {
    document.getElementById(
      "activity-log-table-body"
    ).innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Gagal memuat log: ${error.message}</td></tr>`;
  }
}

// --- LOGIKA HALAMAN MANPOWER ---
function renderManpowerPage() {
  const tbody = document.getElementById("manpower-table-body");
  if (!tbody) return;
  const searchTerm = document
    .getElementById("manpower-search-input")
    .value.toLowerCase();
  const filterDept = document.getElementById("manpower-filter-dept").value;
  filteredManpower = appData.manpower.filter((emp) => {
    const matchesDept = !filterDept || emp.DEPARTMENT === filterDept;
    const matchesSearch =
      searchTerm === "" ||
      (emp.NRP && emp.NRP.toLowerCase().includes(searchTerm)) ||
      (emp.NAME && emp.NAME.toLowerCase().includes(searchTerm)) ||
      (emp.POSITION && emp.POSITION.toLowerCase().includes(searchTerm));
    return matchesDept && matchesSearch;
  });
  const startIndex = (manpowerCurrentPage - 1) * manpowerRowsPerPage;
  const endIndex = startIndex + manpowerRowsPerPage;
  const paginatedData = filteredManpower.slice(startIndex, endIndex);
  if (paginatedData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8">Tidak ada data yang cocok.</td></tr>`;
  } else {
    tbody.innerHTML = paginatedData
      .map(
        (emp) => `
      <tr class="border-t hover:bg-gray-50 cursor-pointer" onclick="showEmployeeDetails('${
        emp.NRP
      }')">
          <td class="p-3">${emp.NRP || ""}</td>
          <td class="p-3 font-semibold">${emp.NAME || ""}</td>
          <td class="p-3">${emp.DEPARTMENT || ""}</td>
          <td class="p-3">${emp.POSITION || ""}</td>
          <td class="p-3">${emp.GRADE || ""}</td>
          <td class="p-3">${
            emp["HIRING DATE"]
              ? new Date(emp["HIRING DATE"]).toLocaleDateString("id-ID")
              : ""
          }</td>
          <td class="p-3 text-center">
              <button onclick="event.stopPropagation(); showEmployeeDetails('${
                emp.NRP
              }')" class="text-blue-600 p-1"><i data-lucide="edit" class="w-4 h-4"></i></button>
              <button onclick="event.stopPropagation(); confirmDelete('manpower', '${
                emp.NRP
              }')" class="text-red-600 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </td>
      </tr>`
      )
      .join("");
  }
  renderManpowerPaginationControls();
  lucide.createIcons();
}

function renderManpowerPaginationControls() {
  const controlsContainer = document.getElementById(
    "manpower-pagination-controls"
  );
  const totalRows = filteredManpower.length;
  const totalPages = Math.ceil(totalRows / manpowerRowsPerPage);
  if (totalPages <= 1) {
    controlsContainer.innerHTML = "";
    return;
  }
  const startRow = Math.min(
    (manpowerCurrentPage - 1) * manpowerRowsPerPage + 1,
    totalRows
  );
  const endRow = Math.min(startRow + manpowerRowsPerPage - 1, totalRows);
  controlsContainer.innerHTML = `
        <span class="text-gray-600">Menampilkan ${startRow} - ${endRow} dari ${totalRows} data</span>
        <div class="flex space-x-2">
            <button onclick="changeManpowerPage(${
              manpowerCurrentPage - 1
            })" class="px-3 py-1 border rounded-md bg-white hover:bg-gray-50" ${
    manpowerCurrentPage === 1 ? "disabled" : ""
  }>Sebelumnya</button>
            <span class="px-3 py-1">Halaman ${manpowerCurrentPage} dari ${totalPages}</span>
            <button onclick="changeManpowerPage(${
              manpowerCurrentPage + 1
            })" class="px-3 py-1 border rounded-md bg-white hover:bg-gray-50" ${
    manpowerCurrentPage === totalPages ? "disabled" : ""
  }>Berikutnya</button>
        </div>`;
}

function changeManpowerPage(newPage) {
  manpowerCurrentPage = newPage;
  renderManpowerPage();
}

function populateDepartmentFilter() {
  const deptFilter = document.getElementById("manpower-filter-dept");
  if (!deptFilter) return;
  const departments = [
    ...new Set(appData.manpower.map((emp) => emp.DEPARTMENT).filter(Boolean)),
  ];
  departments.sort();
  deptFilter.innerHTML = `<option value="">Semua Departemen</option>${departments
    .map((dept) => `<option value="${dept}">${dept}</option>`)
    .join("")}`;
}

// --- LOGIKA HALAMAN REKRUTMEN ---
function showRecruitmentTab(sheetName) {
  activeRecruitmentSheet = sheetName;
  selectedApplicants.clear();
  updateProcessButtonState();
  document.querySelectorAll(".recruitment-tab").forEach((tab) => {
    tab.classList.remove("recruitment-tab-active", "recruitment-tab-inactive");
    tab.classList.add(
      tab.getAttribute("onclick").includes(sheetName)
        ? "recruitment-tab-active"
        : "recruitment-tab-inactive"
    );
  });
  const searchInput = document.getElementById("recruitment-search-input");
  if (recruitmentPageState[sheetName]) {
    searchInput.value = recruitmentPageState[sheetName].searchTerm;
  } else {
    searchInput.value = "";
  }
  if (!appData.recruitment[sheetName]) {
    showLoader("recruitment-table-body");
    document.getElementById("recruitment-table-head").innerHTML = "";
    document.getElementById("recruitment-pagination-controls").innerHTML = "";
    fetchRecruitmentData(sheetName).then(() => {
      renderRecruitmentTabPage(sheetName);
    });
  } else {
    renderRecruitmentTabPage(sheetName);
  }
}

// GANTI FUNGSI INI DI SCRIPT.JS ANDA
function renderRecruitmentTabPage(sheetName) {
  const thead = document.getElementById("recruitment-table-head");
  const tbody = document.getElementById("recruitment-table-body");
  const data = appData.recruitment[sheetName] || [];
  if (!recruitmentPageState[sheetName]) {
    recruitmentPageState[sheetName] = { currentPage: 1, searchTerm: "" };
  }
  const state = recruitmentPageState[sheetName];
  const filteredData =
    state.searchTerm === "" || !state.searchTerm
      ? data
      : data.filter((row) =>
          Object.values(row).some((value) =>
            String(value).toLowerCase().includes(state.searchTerm)
          )
        );
  const startIndex = (state.currentPage - 1) * recruitmentRowsPerPage;
  const endIndex = startIndex + recruitmentRowsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  if (data.length === 0) {
    thead.innerHTML = "";
    tbody.innerHTML = `<tr><td colspan="1" class="text-center p-4">Tidak ada data di tab ini.</td></tr>`;
    renderRecruitmentPagination(sheetName, 0);
    return;
  }
  const headers = Object.keys(data[0] || {});
  thead.innerHTML = `<tr><th class="p-3 font-semibold w-12 text-center"><input type="checkbox" onchange="toggleSelectAll(this, '${sheetName}')" class="rounded border-gray-300"></th>${headers
    .map((h) => `<th class="p-3 font-semibold">${h.replace(/_/g, " ")}</th>`)
    .join("")}</tr>`;
  if (paginatedData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${
      headers.length + 1
    }" class="text-center p-8">Tidak ada data yang cocok.</td></tr>`;
  } else {
    tbody.innerHTML = paginatedData
      .map((row) => {
        const applicantId = row.ID_Pelamar;
        const uniqueId = `${sheetName}|${applicantId}`; // <-- BARIS PENTING 1gabungan sheet dan ID pelamar
        const isSelected = selectedApplicants.has(uniqueId); // <-- BARIS PENTING 2 // Periksa ID unik ini
        return `<tr class="border-b hover:bg-indigo-50 ${
          isSelected ? "bg-indigo-100" : ""
        }">
      <td class="p-3 text-center">
        <input type="checkbox" onchange="toggleApplicantSelection(this, '${sheetName}', '${applicantId}')" class="rounded border-gray-300" ${
          isSelected ? "checked" : ""
        } data-applicant-id="${applicantId}">
      </td>
      ${headers.map((h) => `<td class="p-3">${row[h] || ""}</td>`).join("")}
    </tr>`;
      })
      .join("");
  }
  renderRecruitmentPagination(sheetName, filteredData.length);
  lucide.createIcons();
}

function renderRecruitmentPagination(sheetName, totalRows) {
  const controlsContainer = document.getElementById(
    "recruitment-pagination-controls"
  );
  const totalPages = Math.ceil(totalRows / recruitmentRowsPerPage);
  const currentPage = recruitmentPageState[sheetName]?.currentPage || 1;
  if (totalPages <= 1) {
    controlsContainer.innerHTML = "";
    return;
  }
  const startRow = Math.min(
    (currentPage - 1) * recruitmentRowsPerPage + 1,
    totalRows
  );
  const endRow = Math.min(startRow + recruitmentRowsPerPage - 1, totalRows);
  controlsContainer.innerHTML = `
        <span class="text-gray-600">Menampilkan ${startRow} - ${endRow} dari ${totalRows} data</span>
        <div class="flex space-x-2">
            <button onclick="changeRecruitmentPage('${sheetName}', ${
    currentPage - 1
  })" class="px-3 py-1 border rounded-md bg-white hover:bg-gray-50" ${
    currentPage === 1 ? "disabled" : ""
  }>Sebelumnya</button>
            <span class="px-3 py-1">Halaman ${currentPage} dari ${totalPages}</span>
            <button onclick="changeRecruitmentPage('${sheetName}', ${
    currentPage + 1
  })" class="px-3 py-1 border rounded-md bg-white hover:bg-gray-50" ${
    currentPage === totalPages ? "disabled" : ""
  }>Berikutnya</button>
        </div>`;
}

function changeRecruitmentPage(sheetName, newPage) {
  if (recruitmentPageState[sheetName]) {
    recruitmentPageState[sheetName].currentPage = newPage;
    renderRecruitmentTabPage(sheetName);
  }
}

// GANTI KEDUA FUNGSI INI DI SCRIPT.JS ANDA
function toggleApplicantSelection(checkbox, sheetName, applicantId) {
  const currentSourceSheet = Array.from(selectedApplicants)[0]?.split("|")[0];
  if (currentSourceSheet && currentSourceSheet !== sheetName) {
    selectedApplicants.clear();
    document
      .querySelectorAll('#recruitment-table-body input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));
  }
  const uniqueId = `${sheetName}|${applicantId}`;
  if (checkbox.checked) {
    selectedApplicants.add(uniqueId);
  } else {
    selectedApplicants.delete(uniqueId);
  }
  updateProcessButtonState();
}

function toggleSelectAll(masterCheckbox, sheetName) {
  const visibleCheckboxes = document.querySelectorAll(
    '#recruitment-table-body input[type="checkbox"]'
  );
  visibleCheckboxes.forEach((cb) => {
    if (cb.checked !== masterCheckbox.checked) {
      cb.checked = masterCheckbox.checked;
      const applicantId = cb.dataset.applicantId;
      if (applicantId) {
        const uniqueId = `${sheetName}|${applicantId}`;
        if (masterCheckbox.checked) {
          selectedApplicants.add(uniqueId);
        } else {
          selectedApplicants.delete(uniqueId);
        }
      }
    }
  });
  updateProcessButtonState();
}

// GANTI FUNGSI INI DI SCRIPT.JS ANDA
function updateProcessButtonState() {
  const processBtn = document.getElementById("process-selected-applicant-btn");
  const count = selectedApplicants.size;
  const btnSpan = processBtn.querySelector("span"); // Cari span di dalam tombol
  if (count > 0) {
    processBtn.disabled = false;
    btnSpan.textContent = `Proses ${count} Kandidat`;
  } else {
    processBtn.disabled = true;
    btnSpan.textContent = "Proses Kandidat";
  }
}

function openRecruitmentProcessModal() {
  const count = selectedApplicants.size;
  if (count === 0) {
    showToast(
      "Silakan pilih satu atau lebih kandidat terlebih dahulu.",
      "error"
    );
    return;
  }
  const firstApplicantId = Array.from(selectedApplicants)[0];
  const [sourceSheet] = firstApplicantId.split("|");
  document.getElementById(
    "selected-candidate-info"
  ).textContent = `Anda akan memproses ${count} kandidat.`;
  document.getElementById("selected-candidate-source-sheet").value =
    sourceSheet;
  const allSheets = [
    "Pelamar_Masuk",
    "Kandidat_Terpilih",
    "Proses_Pelamar",
    "Proses_Lanjutan",
    "Proses_Insite",
    "Pelamar_Final",
    "Pelamar_Tersisih",
  ];
  const targetSheetSelect = document.getElementById("target-sheet-select");
  targetSheetSelect.innerHTML = allSheets
    .filter((sheet) => sheet !== sourceSheet)
    .map(
      (sheet) => `<option value="${sheet}">${sheet.replace(/_/g, " ")}</option>`
    )
    .join("");
  openModal("recruitmentProcessModal");
}

async function submitApplicantProcessing() {
  const sourceSheet = document.getElementById(
    "selected-candidate-source-sheet"
  ).value;
  const targetSheet = document.getElementById("target-sheet-select").value;
  const reason = document.getElementById("processing-notes").value;
  const applicantIdsToProcess = Array.from(selectedApplicants).map(
    (uid) => uid.split("|")[1]
  );
  const submitBtn = document.getElementById("recruitment-process-submit-btn");
  submitBtn.disabled = true;
  submitBtn.innerHTML =
    '<div class="loader mx-auto" style="width:20px; height:20px; border-width: 3px; border-top-color:#fff;"></div>';
  try {
    const promises = applicantIdsToProcess.map((applicantId) => {
      const data = { targetSheet, reason: reason || "Diproses via Web App" };
      return apiCall(
        {
          action: "processApplicant",
          id: applicantId,
          sourceSheet: sourceSheet,
        },
        { method: "POST", body: JSON.stringify(data) }
      );
    });
    await Promise.all(promises);
    showToast(`${applicantIdsToProcess.length} kandidat berhasil dipindahkan.`);
    selectedApplicants.clear();
    delete appData.recruitment[sourceSheet];
    delete appData.recruitment[targetSheet];
    await fetchRecruitmentData(sourceSheet);
    if (sourceSheet !== targetSheet) await fetchRecruitmentData(targetSheet);
    showRecruitmentTab(activeRecruitmentSheet);
    updateProcessButtonState();
  } catch (error) {
    showToast(`Proses gagal: ${error.message}`, "error");
  } finally {
    closeModal("recruitmentProcessModal");
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Ya, Proses";
  }
}

// --- RENDERING LAINNYA ---
function renderSPTable() {
  const tbody = document.getElementById("sp-table-body");
  tbody.innerHTML = appData.suratPeringatan
    .map(
      (sp) => `
    <tr class="border-t hover:bg-gray-50">
        <td class="p-3">${
          sp["WAKTU KEJADIAN"]
            ? new Date(sp["TANGGAL KEJADIAN"]).toLocaleDateString("id-ID") +
              " " +
              sp["WAKTU KEJADIAN"]
            : ""
        }</td>
        <td class="p-3">${sp.NRP || ""}</td>
        <td class="p-3 font-semibold">${sp.NAME || ""}</td>
        <td class="p-3">${sp.POSITION || ""}</td>
        <td class="p-3">${sp.SANKSI || ""}</td>
        <td class="p-3">${sp.JENIS || ""}</td>
        <td class="p-3"><span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">${
          sp.STATUS || ""
        }</span></td>
        <td class="p-3 text-center">
            <button onclick="showSPDetailModal('${
              sp["ID DOKUMEN"]
            }')" class="text-gray-600 p-1"><i data-lucide="eye" class="w-4 h-4"></i></button>
        </td>
    </tr>`
    )
    .join("");
  lucide.createIcons();
}

function renderLeaveTable() {
  const tbody = document.getElementById("leave-table-body");
  tbody.innerHTML = appData.leaveApplication
    .map(
      (leave) => `
    <tr class="border-t hover:bg-gray-50">
        <td class="p-3">${leave["ID DOKUMEN"] || ""}</td>
        <td class="p-3">${leave.NRP || ""}</td>
        <td class="p-3 font-semibold">${leave["NAMA PEKERJA"] || ""}</td>
        <td class="p-3">${
          leave["TANGGAL BERANGKAT"]
            ? new Date(leave["TANGGAL BERANGKAT"]).toLocaleDateString("id-ID")
            : ""
        }</td>
        <td class="p-3">${
          leave["TANGGAL KEMBALI"]
            ? new Date(leave["TANGGAL KEMBALI"]).toLocaleDateString("id-ID")
            : ""
        }</td>
        <td class="p-3"><span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">${
          leave.STATUS || ""
        }</span></td>
        <td class="p-3 text-center">
            <button onclick="showLeaveDetails('${
              leave["ID DOKUMEN"]
            }')" class="text-blue-600 p-1"><i data-lucide="edit" class="w-4 h-4"></i></button>
            <button onclick="confirmDelete('leave', '${
              leave["ID DOKUMEN"]
            }')" class="text-red-600 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
    </tr>`
    )
    .join("");
  lucide.createIcons();
}

function renderFamilyTable(familyMembers) {
  const tbody = document.getElementById("family-table-body");
  if (familyMembers.length === 0) {
    tbody.innerHTML = `<tr id="no-family-data"><td colspan="4" class="text-center p-4">Tidak ada data keluarga.</td></tr>`;
    return;
  }
  tbody.innerHTML = familyMembers
    .map(
      (m) => `
    <tr class="border-t" data-family-name="${m["FAMILY NAME"]}">
        <td class="p-2"><input type="text" value="${
          m["FAMILY NAME"] || ""
        }" class="w-full bg-gray-100 p-1 rounded border"></td>
        <td class="p-2"><input type="text" value="${
          m["FAMILY RELATION CODE"] || ""
        }" class="w-full bg-gray-100 p-1 rounded border"></td>
        <td class="p-2"><input type="date" value="${
          m["BIRTH DATE"]
            ? new Date(m["BIRTH DATE"]).toISOString().split("T")[0]
            : ""
        }" class="w-full bg-gray-100 p-1 rounded border"></td>
        <td class="p-2 text-center">
            <button onclick="saveFamilyMember(this)" class="text-green-600 p-1"><i data-lucide="save" class="w-4 h-4"></i></button>
            <button onclick="deleteFamilyMember(this)" class="text-red-600 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
    </tr>`
    )
    .join("");
  lucide.createIcons();
}

function renderActivityLogTable() {
  const tbody = document.getElementById("activity-log-table-body");
  tbody.innerHTML = appData.activityLog
    .map(
      (log) => `
    <tr class="border-t">
        <td class="p-3">${new Date(log.Timestamp).toLocaleString("id-ID")}</td>
        <td class="p-3">${log.User}</td>
        <td class="p-3">${log.Action}</td>
        <td class="p-3">${log.Target_ID}</td>
        <td class="p-3">${log.Description}</td>
    </tr>`
    )
    .join("");
}

// --- CRUD OPERATIONS ---
function generateFormFields(containerId, headers, data = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = headers
    .map(
      (header) => `
    <div>
        <label class="block text-sm font-medium text-gray-500">${header}</label>
        <input type="text" id="form-${header.replace(/ /g, "-")}" value="${
        data[header] || ""
      }" class="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm p-2">
    </div>`
    )
    .join("");
}

function openAddEmployeeModal() {
  document.getElementById("employee-modal-title").innerText =
    "Tambah Karyawan Baru";
  generateFormFields("employee-form-fields", MANPOWER_HEADERS);
  document.getElementById("edit-nrp").value = "";
  openModal("employeeModal");
  switchDetailTab(new Event("click"), "personal-data");
}

function showEmployeeDetails(nrp) {
  const employee = appData.manpower.find((emp) => emp.NRP == nrp);
  if (!employee) return;
  document.getElementById(
    "employee-modal-title"
  ).innerText = `Detail Karyawan: ${employee.NAME}`;
  document.getElementById("edit-nrp").value = employee.NRP;
  generateFormFields("employee-form-fields", MANPOWER_HEADERS, employee);
  openModal("employeeModal");
  switchDetailTab(new Event("click"), "personal-data");
}

function showSPDetails(id) {
  const sp = appData.suratPeringatan.find((s) => s["ID DOKUMEN"] == id);
  if (!sp) return;
  document.getElementById("sp-modal-title").innerText = "Edit Surat Peringatan";
  generateFormFields("sp-form-fields", SP_HEADERS, sp);
  openModal("spModal");
}

async function showSPDetailModal(id) {
  const sp = appData.suratPeringatan.find((s) => s["ID DOKUMEN"] == id);
  if (!sp) return;
  document.getElementById("sp-detail-modal-title").innerText = sp["ID DOKUMEN"];
  const content = document.getElementById("sp-detail-content");
  content.innerHTML = '<div class="loader mx-auto"></div>';
  openModal("spDetailModal");
  const detailHtml = SP_HEADERS.map((header) => {
    if (!["DIBUAT OLEH", "PADA TANGGAL"].includes(header) && sp[header]) {
      return `<div class="grid grid-cols-3 gap-4"><strong class="col-span-1">${header}</strong><span class="col-span-2">: ${sp[header]}</span></div>`;
    }
    return "";
  }).join("");
  content.innerHTML = detailHtml;
}

function openAddSPModal() {
  document.getElementById("sp-modal-title").innerText =
    "Tambah Surat Peringatan";
  generateFormFields("sp-form-fields", SP_HEADERS);
  openModal("spModal");
}

function openAddLeaveModal() {
  document.getElementById("leave-modal-title").innerText =
    "Tambah Pengajuan Cuti";
  generateFormFields("leave-form-fields", LEAVE_HEADERS);
  openModal("leaveModal");
}

function showLeaveDetails(id) {
  const leave = appData.leaveApplication.find((l) => l["ID DOKUMEN"] == id);
  if (!leave) return;
  document.getElementById("leave-modal-title").innerText =
    "Edit Pengajuan Cuti";
  generateFormFields("leave-form-fields", LEAVE_HEADERS, leave);
  openModal("leaveModal");
}

function openAddApplicantModal() {
  document.getElementById("applicantForm").reset();
  document.getElementById("applicant-modal-title").innerText =
    "Tambah Pelamar Baru";
  document.getElementById("applicant-id").value = "";
  openModal("applicantModal");
}

function confirmDelete(type, id) {
  openModal("confirmDeleteModal");
  const btn = document.getElementById("confirm-delete-btn");
  btn.onclick = async () => {
    let action;
    if (type === "manpower") action = "deleteManpower";
    else if (type === "sp") action = "deleteSP";
    else if (type === "leave") action = "deleteLeave";
    else return;
    try {
      await apiCall({ action, id }, { method: "POST" });
      showToast("Data berhasil dihapus.");
      if (type === "manpower") fetchManpowerData();
      else if (type === "sp") fetchSPData();
      else if (type === "leave") fetchLeaveData();
    } catch (error) {
      showToast(`Gagal menghapus: ${error.message}`, "error");
    } finally {
      closeModal("confirmDeleteModal");
    }
  };
}

document
  .getElementById("employeeForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const nrp = document.getElementById("edit-nrp").value;
    const action = nrp ? "updateManpower" : "addManpower";
    const data = {};
    MANPOWER_HEADERS.forEach((header) => {
      const input = document.getElementById(
        `form-${header.replace(/ /g, "-")}`
      );
      if (input) data[header] = input.value;
    });
    if (!nrp) data.NRP = data.NRP || `EMP-${Date.now()}`;
    try {
      await apiCall(
        { action, id: nrp },
        { method: "POST", body: JSON.stringify(data) }
      );
      showToast(
        `Data karyawan berhasil ${nrp ? "diperbarui" : "ditambahkan"}.`
      );
      fetchManpowerData();
    } catch (error) {
      showToast(`Proses gagal: ${error.message}`, "error");
    } finally {
      closeModal("employeeModal");
    }
  });

document
  .getElementById("spForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const idInput = document.getElementById("form-ID-DOKUMEN");
    const id = idInput.value;
    const action =
      id && appData.suratPeringatan.some((sp) => sp["ID DOKUMEN"] === id)
        ? "updateSP"
        : "addSP";
    const data = {};
    SP_HEADERS.forEach((header) => {
      const input = document.getElementById(
        `form-${header.replace(/ /g, "-")}`
      );
      if (input) data[header] = input.value;
    });
    if (action === "addSP") {
      data["ID DOKUMEN"] = data["ID DOKUMEN"] || `SP-${Date.now()}`;
    }
    try {
      await apiCall(
        { action, id: data["ID DOKUMEN"] },
        { method: "POST", body: JSON.stringify(data) }
      );
      showToast(
        `Surat peringatan berhasil ${
          action === "updateSP" ? "diperbarui" : "ditambahkan"
        }.`
      );
      fetchSPData();
    } catch (error) {
      showToast(`Proses gagal: ${error.message}`, "error");
    } finally {
      closeModal("spModal");
    }
  });

document
  .getElementById("leaveForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const idInput = document.getElementById("form-ID-DOKUMEN");
    const id = idInput.value;
    const action =
      id && appData.leaveApplication.some((l) => l["ID DOKUMEN"] === id)
        ? "updateLeave"
        : "addLeave";
    const data = {};
    LEAVE_HEADERS.forEach((header) => {
      const input = document.getElementById(
        `form-${header.replace(/ /g, "-")}`
      );
      if (input) data[header] = input.value;
    });
    if (action === "addLeave") {
      data["ID DOKUMEN"] = data["ID DOKUMEN"] || `LEAVE-${Date.now()}`;
    }
    try {
      await apiCall(
        { action, id: data["ID DOKUMEN"] },
        { method: "POST", body: JSON.stringify(data) }
      );
      showToast(
        `Pengajuan cuti berhasil ${
          action === "updateLeave" ? "diperbarui" : "ditambahkan"
        }.`
      );
      fetchLeaveData();
    } catch (error) {
      showToast(`Proses gagal: ${error.message}`, "error");
    } finally {
      closeModal("leaveModal");
    }
  });

document
  .getElementById("applicantForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("applicant-id").value;
    const data = {
      ID_Pelamar: id || `APP-${Date.now()}`,
      Nama_Lengkap: document.getElementById("applicant-name").value,
      Posisi_Dilamar: document.getElementById("applicant-position").value,
      Email: document.getElementById("applicant-email").value,
      No_Telepon: document.getElementById("applicant-phone").value,
      Tanggal_Pengajuan: new Date().toLocaleDateString("en-CA"),
    };
    try {
      await apiCall(
        { action: "addApplicant", sheet: "Pelamar_Masuk" },
        { method: "POST", body: JSON.stringify(data) }
      );
      showToast(`Pelamar baru berhasil ditambahkan.`);
      // Refresh data in the current tab
      delete appData.recruitment["Pelamar_Masuk"];
      showRecruitmentTab("Pelamar_Masuk");
    } catch (error) {
      showToast(`Proses gagal: ${error.message}`, "error");
    } finally {
      closeModal("applicantModal");
    }
  });

// --- FAMILY TAB CRUD ---
function addFamilyRow() {
  const tbody = document.getElementById("family-table-body");
  document.getElementById("no-family-data")?.remove();
  const newRow = document.createElement("tr");
  newRow.className = "border-t";
  newRow.setAttribute("data-is-new", "true");
  newRow.innerHTML = `
    <td class="p-2"><input type="text" placeholder="Nama" class="w-full bg-gray-100 p-1 rounded border"></td>
    <td class="p-2"><input type="text" placeholder="Hubungan" class="w-full bg-gray-100 p-1 rounded border"></td>
    <td class="p-2"><input type="date" class="w-full bg-gray-100 p-1 rounded border"></td>
    <td class="p-2 text-center">
        <button onclick="saveFamilyMember(this)" class="text-green-600 p-1"><i data-lucide="save" class="w-4 h-4"></i></button>
        <button onclick="this.closest('tr').remove()" class="text-red-600 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </td>`;
  tbody.appendChild(newRow);
  lucide.createIcons();
}

async function saveFamilyMember(button) {
  const row = button.closest("tr");
  const inputs = row.querySelectorAll("input");
  const isNew = row.getAttribute("data-is-new") === "true";
  const originalFamilyName = isNew
    ? null
    : row.getAttribute("data-family-name");
  const data = {
    NRP: document.getElementById("edit-nrp").value,
    "FAMILY NAME": inputs[0].value,
    "FAMILY RELATION CODE": inputs[1].value,
    "BIRTH DATE": new Date(inputs[2].value).toLocaleDateString("en-CA"),
  };
  if (!data["FAMILY NAME"]) {
    showToast("Nama keluarga tidak boleh kosong.", "error");
    return;
  }
  const action = isNew ? "addFamily" : "updateFamily";
  const id = isNew ? null : originalFamilyName;
  try {
    await apiCall(
      { action, id },
      { method: "POST", body: JSON.stringify(data) }
    );
    showToast(
      `Data keluarga berhasil ${isNew ? "ditambahkan" : "diperbarui"}.`
    );
    fetchFamilyData(data.NRP);
  } catch (error) {
    showToast(`Proses gagal: ${error.message}`, "error");
  }
}

async function deleteFamilyMember(button) {
  if (!confirm("Yakin ingin menghapus anggota keluarga ini?")) return;
  const row = button.closest("tr");
  const familyName = row.getAttribute("data-family-name");
  const nrp = document.getElementById("edit-nrp").value;
  if (!familyName) {
    row.remove();
    return;
  }
  try {
    await apiCall(
      { action: "deleteFamily", id: familyName },
      { method: "POST" }
    );
    showToast("Anggota keluarga berhasil dihapus.");
    fetchFamilyData(nrp);
  } catch (error) {
    showToast(`Gagal menghapus: ${error.message}`, "error");
  }
}

// --- DASHBOARD CHARTS ---
function setDashboardDateRange(rangeType) {
  const now = new Date();
  let startDate = new Date();
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );
  switch (rangeType) {
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_3_months":
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "all_time":
    default:
      startDate = null;
      break;
  }
  dashboardDateRange = {
    start: startDate,
    end: rangeType !== "all_time" ? endDate : null,
  };
  document.querySelectorAll(".date-filter-btn").forEach((btn) => {
    btn.classList.remove("bg-blue-500", "text-white", "border-blue-500");
    btn.classList.add("bg-white");
    if (btn.getAttribute("onclick").includes(rangeType)) {
      btn.classList.add("bg-blue-500", "text-white", "border-blue-500");
    }
  });
  const activeTabEl = document.querySelector(".dashboard-tab.active");
  if (activeTabEl) {
    const activeTab = activeTabEl.getAttribute("onclick").match(/'(.*?)'/)[1];
    switchDashboardTab(activeTab);
  }
}

function renderPersonalDashboardCharts() {
  const container = document.getElementById("dashboard-personal-content");
  if (!document.getElementById("religionChart")) {
    container.innerHTML = `<div class="chart-card"><h3 class="font-semibold mb-4">Agama</h3><div class="relative h-64"><canvas id="religionChart"></canvas></div></div><div class="chart-card"><h3 class="font-semibold mb-4">Status Pernikahan</h3><div class="relative h-64"><canvas id="maritalChart"></canvas></div></div><div class="chart-card"><h3 class="font-semibold mb-4">Pendidikan</h3><div class="relative h-64"><canvas id="educationChart"></canvas></div></div><div class="chart-card"><h3 class="font-semibold mb-4">Departemen</h3><div class="relative h-64"><canvas id="departmentChart"></canvas></div></div><div class="chart-card"><h3 class="font-semibold mb-4">Status POH</h3><div class="relative h-64"><canvas id="pohChart"></canvas></div></div><div class="chart-card"><h3 class="font-semibold mb-4">Gender</h3><div class="relative h-64"><canvas id="genderChart"></canvas></div></div>`;
  }

  if (appData.manpower.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center">Tidak ada data untuk ditampilkan.</p>`;
    return;
  }
  const filteredData =
    dashboardDateRange.start === null
      ? appData.manpower
      : appData.manpower.filter((emp) => {
          const hiringDate = emp["HIRING DATE"]
            ? new Date(emp["HIRING DATE"])
            : null;
          return (
            hiringDate &&
            hiringDate >= dashboardDateRange.start &&
            hiringDate <= dashboardDateRange.end
          );
        });

  if (filteredData.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center">Tidak ada karyawan baru pada rentang tanggal yang dipilih.</p>`;
  }

  const processDataForChart = (key) => {
    return filteredData.reduce((acc, curr) => {
      const value = curr[key] || "Tidak Diketahui";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  };

  const chartConfigs = [
    { id: "religionChart", type: "pie", key: "RELIGION", title: "Agama" },
    {
      id: "maritalChart",
      type: "doughnut",
      key: "MARITAL STATUS",
      title: "Status Pernikahan",
    },
    {
      id: "educationChart",
      type: "pie",
      key: "EDUCATION",
      title: "Pendidikan",
    },
    {
      id: "departmentChart",
      type: "bar",
      key: "DEPARTMENT",
      title: "Departemen",
    },
    {
      id: "pohChart",
      type: "doughnut",
      key: "STATUS POH",
      title: "Status POH",
    },
    { id: "genderChart", type: "pie", key: "GENDER", title: "Gender" },
  ];
  chartConfigs.forEach((config) => {
    const chartData =
      filteredData.length === 0 ? {} : processDataForChart(config.key);
    const labels = Object.keys(chartData);
    const data = Object.values(chartData);
    const canvas = document.getElementById(config.id);
    if (canvas) {
      if (charts[config.id]) charts[config.id].destroy();
      charts[config.id] = new Chart(canvas, {
        type: config.type,
        data: {
          labels: labels,
          datasets: [{ label: config.title, data: data, borderWidth: 1 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
        },
      });
    }
  });
}

function renderRecruitmentDashboardCharts() {
  const container = document.getElementById("dashboard-rekrutmen-content");
  if (!document.getElementById("recruitmentFunnelChart")) {
    container.innerHTML = `<div class="chart-card md:col-span-2"> <h3 class="font-semibold mb-4">Funnel Rekrutmen</h3> <div class="relative h-96"><canvas id="recruitmentFunnelChart"></canvas></div> </div>`;
  }

  const filterAndCount = (sheetName, dateKey) => {
    return dashboardDateRange.start === null
      ? (appData.recruitment[sheetName] || []).length
      : (appData.recruitment[sheetName] || []).filter((item) => {
          const itemDate = item[dateKey] ? new Date(item[dateKey]) : null;
          return (
            itemDate &&
            itemDate >= dashboardDateRange.start &&
            itemDate <= dashboardDateRange.end
          );
        }).length;
  };

  const labels = ["Pelamar Masuk", "Kandidat Terpilih", "Pelamar Final"];
  // Note: This is a simplified funnel view. A true time-based funnel is more complex.
  const data = [
    filterAndCount("Pelamar_Masuk", "Tanggal_Pengajuan"),
    filterAndCount("Kandidat_Terpilih", "Tanggal_Proses"),
    filterAndCount("Pelamar_Final", "Tanggal_Proses"),
  ];

  const canvas = document.getElementById("recruitmentFunnelChart");
  if (canvas) {
    if (charts.recruitmentFunnel) charts.recruitmentFunnel.destroy();
    charts.recruitmentFunnel = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: `Jumlah Kandidat`,
            data: data,
            backgroundColor: ["#60a5fa", "#3b82f6", "#1d4ed8"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: { legend: { display: false } },
      },
    });
  }
}

function renderSPDashboardCharts() {
  const container = document.getElementById("dashboard-sp-content");
  if (!document.getElementById("spBySanksiChart")) {
    container.innerHTML = `<div class="chart-card"><h3 class="font-semibold mb-4">SP per Sanksi</h3><div class="relative h-80"><canvas id="spBySanksiChart"></canvas></div></div><div class="chart-card"><h3 class="font-semibold mb-4">SP per Departemen</h3><div class="relative h-80"><canvas id="spByDeptChart"></canvas></div></div>`;
  }

  const filteredData =
    dashboardDateRange.start === null
      ? appData.suratPeringatan
      : appData.suratPeringatan.filter((sp) => {
          const eventDate = sp["TANGGAL KEJADIAN"]
            ? new Date(sp["TANGGAL KEJADIAN"])
            : null;
          return (
            eventDate &&
            eventDate >= dashboardDateRange.start &&
            eventDate <= dashboardDateRange.end
          );
        });

  if (filteredData.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center">Tidak ada data SP pada rentang tanggal yang dipilih.</p>`;
  }

  const spBySanksiData = filteredData.reduce((acc, curr) => {
    const sanksi = curr["SANKSI"] || "Lainnya";
    acc[sanksi] = (acc[sanksi] || 0) + 1;
    return acc;
  }, {});
  const spByDeptData = filteredData.reduce((acc, curr) => {
    const dept = curr["DEPARTMENT"] || "Tidak Diketahui";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const sanksiCanvas = document.getElementById("spBySanksiChart");
  if (sanksiCanvas) {
    if (charts.spBySanksi) charts.spBySanksi.destroy();
    charts.spBySanksi = new Chart(sanksiCanvas, {
      type: "doughnut",
      data: {
        labels: Object.keys(spBySanksiData),
        datasets: [{ data: Object.values(spBySanksiData) }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "right" } },
      },
    });
  }
  const deptCanvas = document.getElementById("spByDeptChart");
  if (deptCanvas) {
    if (charts.spByDept) charts.spByDept.destroy();
    charts.spByDept = new Chart(deptCanvas, {
      type: "bar",
      data: {
        labels: Object.keys(spByDeptData),
        datasets: [{ label: "Jumlah SP", data: Object.values(spByDeptData) }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
  }
}

// --- INITIAL LOAD & EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const body = document.body;
  sidebar.addEventListener("mouseenter", () =>
    body.classList.add("sidebar-expanded")
  );
  sidebar.addEventListener("mouseleave", () =>
    body.classList.remove("sidebar-expanded")
  );

  showPage("dashboard");
  setDashboardDateRange("all_time");
  lucide.createIcons();

  document
    .getElementById("export-manpower-btn")
    .addEventListener("click", () => {
      exportToExcel(filteredManpower, "Daftar_Karyawan.xlsx");
    });

  document
    .getElementById("export-recruitment-btn")
    .addEventListener("click", () => {
      const state = recruitmentPageState[activeRecruitmentSheet] || {};
      const data = appData.recruitment[activeRecruitmentSheet] || [];
      const filteredData =
        state.searchTerm === "" || !state.searchTerm
          ? data
          : data.filter((row) =>
              Object.values(row).some((value) =>
                String(value).toLowerCase().includes(state.searchTerm)
              )
            );
      exportToExcel(filteredData, `Rekrutmen_${activeRecruitmentSheet}.xlsx`);
    });

  document
    .getElementById("manpower-search-input")
    .addEventListener("input", () => {
      manpowerCurrentPage = 1;
      renderManpowerPage();
    });

  document
    .getElementById("manpower-filter-dept")
    .addEventListener("change", () => {
      manpowerCurrentPage = 1;
      renderManpowerPage();
    });

  document
    .getElementById("recruitment-search-input")
    .addEventListener("input", (e) => {
      if (!recruitmentPageState[activeRecruitmentSheet]) {
        recruitmentPageState[activeRecruitmentSheet] = {
          currentPage: 1,
          searchTerm: "",
        };
      }
      const state = recruitmentPageState[activeRecruitmentSheet];
      state.searchTerm = e.target.value.toLowerCase();
      state.currentPage = 1;
      renderRecruitmentTabPage(activeRecruitmentSheet);
    });
});
