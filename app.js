const USERS_KEY = "an_digital_users";
const PAYMENTS_KEY = "an_digital_payments";
const CURRENT_USER_KEY = "an_digital_current_user";
const BUSINESS_WA_NUMBER = "6288245213110";
const PAYMENT_STATUS_WAITING = "Menunggu pengecekan admin";
const PAYMENT_STATUS_CONFIRMED = "Pembayaran dikonfirmasi admin";
const PAYMENT_STATUS_REJECTED = "Pembayaran ditolak admin";

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getPayments() {
  return JSON.parse(localStorage.getItem(PAYMENTS_KEY) || "[]");
}

function isPaymentStatusConfirmedByAdmin(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return false;

  const confirmedStatuses = [
    PAYMENT_STATUS_CONFIRMED,
    "terverifikasi",
    "lunas",
    "sudah dikonfirmasi"
  ].map((item) => item.toLowerCase());

  return confirmedStatuses.includes(normalized);
}

function hasAdminConfirmedPayment(userEmail) {
  const email = String(userEmail || "").trim().toLowerCase();
  if (!email) return false;

  const latestPayment = getPayments().find(
    (payment) => String(payment.userEmail || "").trim().toLowerCase() === email
  );

  if (!latestPayment) return false;
  return isPaymentStatusConfirmedByAdmin(latestPayment.status);
}

function toCanonicalPaymentStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return PAYMENT_STATUS_WAITING;
  if (isPaymentStatusConfirmedByAdmin(normalized)) return PAYMENT_STATUS_CONFIRMED;

  const rejectedKeywords = ["tolak", "ditolak", "gagal", "batal", "invalid"];
  if (rejectedKeywords.some((keyword) => normalized.includes(keyword))) {
    return PAYMENT_STATUS_REJECTED;
  }

  return PAYMENT_STATUS_WAITING;
}

function savePayments(payments) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
}

function getCurrentUser() {
  return JSON.parse(sessionStorage.getItem(CURRENT_USER_KEY) || "null");
}

function setCurrentUser(user) {
  sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  sessionStorage.removeItem(CURRENT_USER_KEY);
}

function normalizeUsers(users) {
  return users.map((user) => {
    const role = user.role === "admin" ? "admin" : "user";
    const isVerified = role === "admin" ? true : Boolean(user.isVerified);

    return {
      ...user,
      role,
      isVerified
    };
  });
}

function setStatus(id, message, type = "") {
  const statusEl = document.getElementById(id);
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "status";
  if (type) {
    statusEl.classList.add(type);
  }
}

function ensureDefaultAdmin() {
  const users = normalizeUsers(getUsers());
  const hasAdmin = users.some((user) => user.role === "admin");

  if (!hasAdmin) {
    users.push({
      name: "Admin AN Digital",
      email: "admin@andigital.id",
      phone: "081234567890",
      password: "admin123",
      role: "admin",
      isVerified: true
    });
  }

  saveUsers(users);
}

function handleRegisterPage() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim().toLowerCase(),
      phone: String(formData.get("phone") || "").trim(),
      password: String(formData.get("password") || "").trim(),
      role: "user",
      isVerified: false
    };

    const users = normalizeUsers(getUsers());
    const alreadyExists = users.some((user) => user.email === payload.email);

    if (alreadyExists) {
      setStatus("registerStatus", "Email sudah terdaftar. Silakan gunakan email lain.", "error");
      return;
    }

    users.push(payload);
    saveUsers(users);
    form.reset();
    setStatus("registerStatus", "Registrasi berhasil. Lanjutkan konfirmasi pembayaran, lalu tunggu verifikasi admin.", "success");

    setTimeout(() => {
      window.location.href = "payment.html";
    }, 1200);
  });
}

function handleLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "").trim();

    const users = normalizeUsers(getUsers());
    const user = users.find((item) => item.email === email && item.password === password);

    if (!user) {
      setStatus("loginStatus", "Akun tidak ditemukan. Cek email dan password Anda.", "error");
      return;
    }

    if (user.role === "user" && !user.isVerified) {
      clearCurrentUser();
      setStatus("loginStatus", "Akun belum diverifikasi admin. Silakan konfirmasi pembayaran terlebih dahulu.", "error");

      setTimeout(() => {
        window.location.href = "payment.html";
      }, 1400);
      return;
    }

    setCurrentUser({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isVerified: user.isVerified
    });

    setStatus("loginStatus", "Login berhasil. Mengalihkan halaman...", "success");

    setTimeout(() => {
      if (user.role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "member.html";
      }
    }, 700);
  });
}

function handlePaymentPage() {
  const form = document.getElementById("paymentForm");
  if (!form) return;

  const user = getCurrentUser();
  const paymentMethodInput = document.getElementById("paymentMethod");
  const payerEmailInput = document.getElementById("payerEmail");
  const qrisBox = document.getElementById("qrisBox");
  const qrisImage = document.getElementById("qrisImage");
  const qrisImageError = document.getElementById("qrisImageError");

  function toggleQrisBox() {
    if (!qrisBox || !paymentMethodInput) return;
    const shouldShowQris = paymentMethodInput.value === "QRIS";
    qrisBox.hidden = !shouldShowQris;
  }

  function handleQrisImageError() {
    if (!qrisImageError) return;
    qrisImageError.hidden = false;
  }

  if (qrisImage) {
    qrisImage.addEventListener("error", handleQrisImageError);
  }

  if (user && user.role === "user") {
    if (payerEmailInput) {
      payerEmailInput.value = user.email;
    }
  } else {
    setStatus("paymentStatus", "Isi email akun yang didaftarkan agar admin bisa memverifikasi.", "error");
  }

  if (paymentMethodInput) {
    paymentMethodInput.addEventListener("change", toggleQrisBox);
  }
  toggleQrisBox();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payerEmail = String(formData.get("payerEmail") || "").trim().toLowerCase();
    const amount = Number(formData.get("amount") || 0);
    const method = String(formData.get("paymentMethod") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    const users = normalizeUsers(getUsers());
    const registeredUser = users.find((item) => item.email === payerEmail && item.role === "user");

    if (!registeredUser) {
      setStatus("paymentStatus", "Email belum terdaftar sebagai user. Silakan registrasi terlebih dahulu.", "error");
      return;
    }

    const autoReference = `PAY-${Date.now()}`;
    const payment = {
      date: new Date().toLocaleString("id-ID"),
      userName: registeredUser.name,
      userEmail: payerEmail,
      method,
      payerName: registeredUser.name,
      amount,
      reference: autoReference,
      notes,
      status: PAYMENT_STATUS_WAITING
    };

    if (!payment.method || !payment.userEmail || payment.amount <= 0) {
      setStatus("paymentStatus", "Mohon isi data pembayaran dengan lengkap.", "error");
      return;
    }

    const payments = getPayments();
    payments.unshift(payment);
    savePayments(payments);

    const whatsappMessage = [
      "Halo Admin AN Digital Academy, saya mengirim konfirmasi pembayaran.",
      "",
      `Nama: ${payment.userName}`,
      `Email: ${payment.userEmail}`,
      `Metode: ${payment.method}`,
      `Jumlah: Rp${Number(payment.amount).toLocaleString("id-ID")}`,
      `Referensi: ${payment.reference}`,
      `Tanggal: ${payment.date}`,
      `Catatan: ${payment.notes || "-"}`
    ].join("\n");

    const whatsappUrl = `https://wa.me/${BUSINESS_WA_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    form.reset();
    toggleQrisBox();
    setStatus("paymentStatus", "Konfirmasi tersimpan. Jendela WhatsApp dibuka untuk kirim data ke admin.", "success");
  });
}

function setUserVerification(email, isVerified) {
  const users = normalizeUsers(getUsers());
  const index = users.findIndex((item) => item.email === email);

  if (index === -1) return false;
  if (users[index].role === "admin") return false;

  users[index].isVerified = isVerified;
  saveUsers(users);
  return true;
}

function createUserByAdmin(payload) {
  const users = normalizeUsers(getUsers());
  const alreadyExists = users.some((item) => item.email === payload.email);

  if (alreadyExists) {
    return { success: false, reason: "exists" };
  }

  users.push({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    password: payload.password,
    role: "user",
    isVerified: payload.isVerified
  });

  saveUsers(users);
  return { success: true };
}

function updateUserByAdmin(originalEmail, payload) {
  const users = normalizeUsers(getUsers());
  const index = users.findIndex((item) => item.email === originalEmail && item.role === "user");

  if (index === -1) {
    return { success: false, reason: "not_found" };
  }

  const emailUsedByOthers = users.some((item, itemIndex) => item.email === payload.email && itemIndex !== index);
  if (emailUsedByOthers) {
    return { success: false, reason: "exists" };
  }

  const previousUser = users[index];
  users[index] = {
    ...previousUser,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    isVerified: payload.isVerified,
    role: "user",
    password: payload.password || previousUser.password
  };

  saveUsers(users);

  if (previousUser.email !== payload.email || previousUser.name !== payload.name) {
    const payments = getPayments().map((payment) => {
      if (payment.userEmail !== previousUser.email) return payment;

      return {
        ...payment,
        userEmail: payload.email,
        userName: payload.name,
        payerName: payload.name
      };
    });

    savePayments(payments);
  }

  return { success: true };
}

function deleteUserByAdmin(email) {
  const users = normalizeUsers(getUsers());
  const index = users.findIndex((item) => item.email === email && item.role === "user");

  if (index === -1) {
    return { success: false };
  }

  users.splice(index, 1);
  saveUsers(users);
  return { success: true };
}

function createPaymentByAdmin(payload) {
  const payments = getPayments();
  const isReferenceUsed = payments.some((item) => item.reference === payload.reference);

  if (isReferenceUsed) {
    return { success: false, reason: "exists" };
  }

  payments.unshift(payload);
  savePayments(payments);
  return { success: true };
}

function updatePaymentByAdmin(originalReference, payload) {
  const payments = getPayments();
  const index = payments.findIndex((item) => item.reference === originalReference);

  if (index === -1) {
    return { success: false, reason: "not_found" };
  }

  const referenceUsedByOthers = payments.some(
    (item, itemIndex) => item.reference === payload.reference && itemIndex !== index
  );

  if (referenceUsedByOthers) {
    return { success: false, reason: "exists" };
  }

  payments[index] = {
    ...payments[index],
    ...payload
  };

  savePayments(payments);
  return { success: true };
}

function deletePaymentByAdmin(reference) {
  const payments = getPayments();
  const index = payments.findIndex((item) => item.reference === reference);

  if (index === -1) {
    return { success: false };
  }

  payments.splice(index, 1);
  savePayments(payments);
  return { success: true };
}

function renderUsersTable(usersTableBody) {
  const users = normalizeUsers(getUsers()).filter((item) => item.role === "user");

  if (!users.length) {
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="6">Belum ada user terdaftar.</td>
      </tr>
    `;
    return;
  }

  usersTableBody.innerHTML = users
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.email}</td>
        <td>${item.phone}</td>
        <td>${item.password || "-"}</td>
        <td>${item.isVerified ? "Terverifikasi" : "Menunggu verifikasi"}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline verify-btn" type="button" data-email="${item.email}" data-verified="${item.isVerified}">
              ${item.isVerified ? "Batalkan" : "Verifikasi"}
            </button>
            <button class="btn btn-outline edit-user-btn" type="button" data-email="${item.email}">
              Edit
            </button>
            <button class="btn btn-outline delete-user-btn" type="button" data-email="${item.email}">
              Hapus
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
}

function renderPaymentsTable(paymentsTableBody) {
  const payments = getPayments();

  paymentsTableBody.innerHTML = payments.length
    ? payments
        .map(
          (item) => `
          <tr>
            <td>${item.date}</td>
            <td>${item.userName}</td>
            <td>${item.userEmail}</td>
            <td>${item.method}</td>
            <td>Rp${Number(item.amount).toLocaleString("id-ID")}</td>
            <td>${item.reference}</td>
            <td>${item.status || "-"}</td>
            <td>
              <div class="table-actions">
                <button class="btn btn-outline edit-payment-btn" type="button" data-reference="${item.reference}">Edit</button>
                <button class="btn btn-outline delete-payment-btn" type="button" data-reference="${item.reference}">Hapus</button>
              </div>
            </td>
          </tr>
        `
        )
        .join("")
    : `
      <tr>
        <td colspan="8">Belum ada data pembayaran.</td>
      </tr>
    `;
}

function handleAdminPage() {
  const greetingEl = document.getElementById("adminGreeting");
  const usersTableBody = document.getElementById("usersTableBody");
  const paymentsTableBody = document.getElementById("paymentsTableBody");
  const adminUserForm = document.getElementById("adminUserForm");
  const adminUserFormTitle = document.getElementById("adminUserFormTitle");
  const adminUserOriginalEmail = document.getElementById("adminUserOriginalEmail");
  const adminUserName = document.getElementById("adminUserName");
  const adminUserEmail = document.getElementById("adminUserEmail");
  const adminUserPhone = document.getElementById("adminUserPhone");
  const adminUserPassword = document.getElementById("adminUserPassword");
  const adminUserVerified = document.getElementById("adminUserVerified");
  const adminUserCancelBtn = document.getElementById("adminUserCancelBtn");
  const adminPaymentForm = document.getElementById("adminPaymentForm");
  const adminPaymentFormTitle = document.getElementById("adminPaymentFormTitle");
  const adminPaymentOriginalReference = document.getElementById("adminPaymentOriginalReference");
  const adminPaymentUserName = document.getElementById("adminPaymentUserName");
  const adminPaymentUserEmail = document.getElementById("adminPaymentUserEmail");
  const adminPaymentMethod = document.getElementById("adminPaymentMethod");
  const adminPaymentAmount = document.getElementById("adminPaymentAmount");
  const adminPaymentReference = document.getElementById("adminPaymentReference");
  const adminPaymentStatusField = document.getElementById("adminPaymentStatusField");
  const adminPaymentNotes = document.getElementById("adminPaymentNotes");
  const adminPaymentCancelBtn = document.getElementById("adminPaymentCancelBtn");
  if (!greetingEl || !usersTableBody || !paymentsTableBody) return;

  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    setStatus("adminStatus", "Akses ditolak. Login sebagai admin terlebih dahulu.", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
    return;
  }

  greetingEl.textContent = `Halo, ${user.name}. Berikut data pendaftar dan pembayaran terbaru.`;

  function resetAdminUserForm() {
    if (!(adminUserForm instanceof HTMLFormElement)) return;
    adminUserForm.reset();
    if (adminUserOriginalEmail instanceof HTMLInputElement) {
      adminUserOriginalEmail.value = "";
    }
    if (adminUserFormTitle instanceof HTMLElement) {
      adminUserFormTitle.textContent = "Tambah User Baru";
    }
    if (adminUserVerified instanceof HTMLSelectElement) {
      adminUserVerified.value = "false";
    }
  }

  function loadUserToForm(email) {
    const selectedUser = normalizeUsers(getUsers()).find((item) => item.email === email && item.role === "user");
    if (!selectedUser) {
      setStatus("adminStatus", "User tidak ditemukan untuk diedit.", "error");
      return;
    }

    if (adminUserFormTitle instanceof HTMLElement) {
      adminUserFormTitle.textContent = "Edit User";
    }
    if (adminUserOriginalEmail instanceof HTMLInputElement) {
      adminUserOriginalEmail.value = selectedUser.email;
    }
    if (adminUserName instanceof HTMLInputElement) {
      adminUserName.value = selectedUser.name;
    }
    if (adminUserEmail instanceof HTMLInputElement) {
      adminUserEmail.value = selectedUser.email;
    }
    if (adminUserPhone instanceof HTMLInputElement) {
      adminUserPhone.value = selectedUser.phone;
    }
    if (adminUserPassword instanceof HTMLInputElement) {
      adminUserPassword.value = "";
    }
    if (adminUserVerified instanceof HTMLSelectElement) {
      adminUserVerified.value = String(selectedUser.isVerified);
    }

    setStatus("adminUserStatus", `Mode edit untuk ${selectedUser.email}.`, "success");
  }

  function resetAdminPaymentForm() {
    if (!(adminPaymentForm instanceof HTMLFormElement)) return;
    adminPaymentForm.reset();

    if (adminPaymentOriginalReference instanceof HTMLInputElement) {
      adminPaymentOriginalReference.value = "";
    }
    if (adminPaymentFormTitle instanceof HTMLElement) {
      adminPaymentFormTitle.textContent = "Tambah Konfirmasi Pembayaran";
    }
    if (adminPaymentStatusField instanceof HTMLSelectElement) {
      adminPaymentStatusField.value = PAYMENT_STATUS_WAITING;
    }
  }

  function loadPaymentToForm(reference) {
    const payment = getPayments().find((item) => item.reference === reference);
    if (!payment) {
      setStatus("adminPaymentStatus", "Data pembayaran tidak ditemukan.", "error");
      return;
    }

    if (adminPaymentFormTitle instanceof HTMLElement) {
      adminPaymentFormTitle.textContent = "Edit Konfirmasi Pembayaran";
    }
    if (adminPaymentOriginalReference instanceof HTMLInputElement) {
      adminPaymentOriginalReference.value = payment.reference;
    }
    if (adminPaymentUserName instanceof HTMLInputElement) {
      adminPaymentUserName.value = payment.userName || "";
    }
    if (adminPaymentUserEmail instanceof HTMLInputElement) {
      adminPaymentUserEmail.value = payment.userEmail || "";
    }
    if (adminPaymentMethod instanceof HTMLSelectElement) {
      adminPaymentMethod.value = payment.method || "";
    }
    if (adminPaymentAmount instanceof HTMLInputElement) {
      adminPaymentAmount.value = String(payment.amount || "");
    }
    if (adminPaymentReference instanceof HTMLInputElement) {
      adminPaymentReference.value = payment.reference || "";
    }
    if (adminPaymentStatusField instanceof HTMLSelectElement) {
      adminPaymentStatusField.value = toCanonicalPaymentStatus(payment.status);
    }
    if (adminPaymentNotes instanceof HTMLTextAreaElement) {
      adminPaymentNotes.value = payment.notes || "";
    }

    setStatus("adminPaymentStatus", `Mode edit untuk referensi ${payment.reference}.`, "success");
  }

  renderUsersTable(usersTableBody);
  renderPaymentsTable(paymentsTableBody);

  if (adminUserForm instanceof HTMLFormElement) {
    adminUserForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(adminUserForm);
      const originalEmail = String(formData.get("originalEmail") || "").trim().toLowerCase();
      const payload = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim().toLowerCase(),
        phone: String(formData.get("phone") || "").trim(),
        password: String(formData.get("password") || "").trim(),
        isVerified: String(formData.get("isVerified") || "false") === "true"
      };

      if (!payload.name || !payload.email || !payload.phone) {
        setStatus("adminUserStatus", "Nama, email, dan nomor WA wajib diisi.", "error");
        return;
      }

      if (!originalEmail && !payload.password) {
        setStatus("adminUserStatus", "Password wajib diisi untuk user baru.", "error");
        return;
      }

      if (!originalEmail) {
        const created = createUserByAdmin(payload);
        if (!created.success) {
          setStatus("adminUserStatus", "Email sudah digunakan oleh akun lain.", "error");
          return;
        }

        renderUsersTable(usersTableBody);
        setStatus("adminUserStatus", `User ${payload.email} berhasil ditambahkan.`, "success");
        setStatus("adminStatus", "Data user berhasil diperbarui.", "success");
        resetAdminUserForm();
        return;
      }

      const updated = updateUserByAdmin(originalEmail, payload);
      if (!updated.success) {
        setStatus(
          "adminUserStatus",
          updated.reason === "exists"
            ? "Email sudah digunakan oleh akun lain."
            : "User gagal diperbarui.",
          "error"
        );
        return;
      }

      renderUsersTable(usersTableBody);
      renderPaymentsTable(paymentsTableBody);
      setStatus("adminUserStatus", `User ${payload.email} berhasil diperbarui.`, "success");
      setStatus("adminStatus", "Data user berhasil diperbarui.", "success");
      resetAdminUserForm();
    });
  }

  if (adminUserCancelBtn instanceof HTMLButtonElement) {
    adminUserCancelBtn.addEventListener("click", () => {
      resetAdminUserForm();
      setStatus("adminUserStatus", "Mode edit dibatalkan.", "success");
    });
  }

  if (adminPaymentForm instanceof HTMLFormElement) {
    adminPaymentForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(adminPaymentForm);
      const originalReference = String(formData.get("originalReference") || "").trim();
      const amount = Number(formData.get("amount") || 0);
      const referenceInput = String(formData.get("reference") || "").trim();

      const payload = {
        date: new Date().toLocaleString("id-ID"),
        userName: String(formData.get("userName") || "").trim(),
        userEmail: String(formData.get("userEmail") || "").trim().toLowerCase(),
        method: String(formData.get("method") || "").trim(),
        payerName: String(formData.get("userName") || "").trim(),
        amount,
        reference: referenceInput || `PAY-${Date.now()}`,
        notes: String(formData.get("notes") || "").trim(),
        status: String(formData.get("status") || PAYMENT_STATUS_WAITING).trim()
      };

      if (!payload.userName || !payload.userEmail || !payload.method || payload.amount <= 0) {
        setStatus("adminPaymentStatus", "Nama, email, metode, dan jumlah wajib diisi valid.", "error");
        return;
      }

      if (!originalReference) {
        const created = createPaymentByAdmin(payload);
        if (!created.success) {
          setStatus("adminPaymentStatus", "Referensi pembayaran sudah digunakan.", "error");
          return;
        }

        renderPaymentsTable(paymentsTableBody);
        setStatus("adminPaymentStatus", `Pembayaran ${payload.reference} berhasil ditambahkan.`, "success");
        setStatus("adminStatus", "Data pembayaran berhasil diperbarui.", "success");
        resetAdminPaymentForm();
        return;
      }

      const updated = updatePaymentByAdmin(originalReference, payload);
      if (!updated.success) {
        setStatus(
          "adminPaymentStatus",
          updated.reason === "exists"
            ? "Referensi pembayaran sudah digunakan data lain."
            : "Data pembayaran gagal diperbarui.",
          "error"
        );
        return;
      }

      renderPaymentsTable(paymentsTableBody);
      setStatus("adminPaymentStatus", `Pembayaran ${payload.reference} berhasil diperbarui.`, "success");
      setStatus("adminStatus", "Data pembayaran berhasil diperbarui.", "success");
      resetAdminPaymentForm();
    });
  }

  if (adminPaymentCancelBtn instanceof HTMLButtonElement) {
    adminPaymentCancelBtn.addEventListener("click", () => {
      resetAdminPaymentForm();
      setStatus("adminPaymentStatus", "Mode edit pembayaran dibatalkan.", "success");
    });
  }

  usersTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const verifyBtn = target.closest(".verify-btn");
    if (verifyBtn instanceof HTMLButtonElement) {
      const email = verifyBtn.dataset.email;
      const isVerified = verifyBtn.dataset.verified === "true";
      if (!email) return;

      const updated = setUserVerification(email, !isVerified);
      if (!updated) {
        setStatus("adminStatus", "Gagal memperbarui status verifikasi user.", "error");
        return;
      }

      renderUsersTable(usersTableBody);
      setStatus(
        "adminStatus",
        !isVerified
          ? `User ${email} berhasil diverifikasi.`
          : `Verifikasi user ${email} berhasil dibatalkan.`,
        "success"
      );
      return;
    }

    const editBtn = target.closest(".edit-user-btn");
    if (editBtn instanceof HTMLButtonElement) {
      const email = editBtn.dataset.email;
      if (!email) return;
      loadUserToForm(email);
      return;
    }

    const deleteBtn = target.closest(".delete-user-btn");
    if (deleteBtn instanceof HTMLButtonElement) {
      const email = deleteBtn.dataset.email;
      if (!email) return;

      const confirmed = window.confirm(`Hapus akun user ${email}?`);
      if (!confirmed) return;

      const deleted = deleteUserByAdmin(email);
      if (!deleted.success) {
        setStatus("adminStatus", "User gagal dihapus.", "error");
        return;
      }

      renderUsersTable(usersTableBody);
      setStatus("adminStatus", `User ${email} berhasil dihapus.`, "success");
      setStatus("adminUserStatus", "Data user berhasil dihapus.", "success");

      if (adminUserOriginalEmail instanceof HTMLInputElement && adminUserOriginalEmail.value === email) {
        resetAdminUserForm();
      }
    }
  });

  paymentsTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const editPaymentBtn = target.closest(".edit-payment-btn");
    if (editPaymentBtn instanceof HTMLButtonElement) {
      const reference = editPaymentBtn.dataset.reference;
      if (!reference) return;
      loadPaymentToForm(reference);
      return;
    }

    const deletePaymentBtn = target.closest(".delete-payment-btn");
    if (deletePaymentBtn instanceof HTMLButtonElement) {
      const reference = deletePaymentBtn.dataset.reference;
      if (!reference) return;

      const confirmed = window.confirm(`Hapus data pembayaran dengan referensi ${reference}?`);
      if (!confirmed) return;

      const deleted = deletePaymentByAdmin(reference);
      if (!deleted.success) {
        setStatus("adminPaymentStatus", "Data pembayaran gagal dihapus.", "error");
        return;
      }

      renderPaymentsTable(paymentsTableBody);
      setStatus("adminPaymentStatus", `Pembayaran ${reference} berhasil dihapus.`, "success");
      setStatus("adminStatus", "Data pembayaran berhasil diperbarui.", "success");

      if (
        adminPaymentOriginalReference instanceof HTMLInputElement
        && adminPaymentOriginalReference.value === reference
      ) {
        resetAdminPaymentForm();
      }
    }
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearCurrentUser();
      window.location.href = "index.html";
    });
  }
}

function handleMemberPage() {
  const greetingEl = document.getElementById("memberGreeting");
  if (!greetingEl) return;

  const memberEmail = document.getElementById("memberEmail");
  const memberAccountStatus = document.getElementById("memberAccountStatus");
  const memberPaymentBtn = document.getElementById("memberPaymentBtn");
  const logoutBtn = document.getElementById("memberLogoutBtn");
  const user = getCurrentUser();

  if (!user) {
    setStatus("memberStatus", "Silakan login terlebih dahulu.", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 900);
    return;
  }

  if (user.role === "admin") {
    window.location.href = "admin.html";
    return;
  }

  const isPaymentConfirmed = hasAdminConfirmedPayment(user.email);

  if (!isPaymentConfirmed) {
    if (memberPaymentBtn instanceof HTMLAnchorElement) {
      memberPaymentBtn.hidden = false;
      memberPaymentBtn.style.display = "inline-flex";
    }

    setStatus(
      "memberStatus",
      "Akses modul dikunci sampai pembayaran Anda dikonfirmasi admin. Silakan lakukan konfirmasi pembayaran atau tunggu verifikasi admin.",
      "error"
    );

    setTimeout(() => {
      window.location.href = "payment.html";
    }, 1300);
    return;
  }

  if (!user.isVerified) {
    setStatus("memberStatus", "Akun Anda belum diverifikasi admin.", "error");
    setTimeout(() => {
      window.location.href = "payment.html";
    }, 1200);
    return;
  }

  greetingEl.textContent = `Selamat datang, ${user.name}. Username Anda: ${user.name}`;

  if (memberEmail instanceof HTMLElement) {
    memberEmail.textContent = user.email;
  }

  if (memberAccountStatus instanceof HTMLElement) {
    memberAccountStatus.textContent = user.isVerified ? "Terverifikasi" : "Menunggu verifikasi";
  }

  if (memberPaymentBtn instanceof HTMLAnchorElement) {
    const shouldShowPaymentButton = !isPaymentConfirmed;
    memberPaymentBtn.hidden = !shouldShowPaymentButton;
    memberPaymentBtn.style.display = shouldShowPaymentButton ? "inline-flex" : "none";
  }

  if (logoutBtn instanceof HTMLButtonElement) {
    logoutBtn.addEventListener("click", () => {
      clearCurrentUser();
      window.location.href = "index.html";
    });
  }
}

function init() {
  ensureDefaultAdmin();
  handleRegisterPage();
  handleLoginPage();
  handlePaymentPage();
  handleAdminPage();
  handleMemberPage();
}

document.addEventListener("DOMContentLoaded", init);
