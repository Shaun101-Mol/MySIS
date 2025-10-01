//  LocalStorage Helpers 
function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}
function setUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}
function getStudents() {
  return JSON.parse(localStorage.getItem("students") || "[]");
}
function setStudents(students) {
  localStorage.setItem("students", JSON.stringify(students));
}
function setSession(user) {
  localStorage.setItem("session", JSON.stringify(user));
}
function getSession() {
  return JSON.parse(localStorage.getItem("session") || "null");
}
function clearSession() {
  localStorage.removeItem("session");
}

// demo data
if (!localStorage.getItem("students")) {
  const users = getUsers();
  const studentUsers = users.filter(u => u.role === "Student");
  if (studentUsers.length > 0) {
    setStudents(studentUsers.map((u, i) => ({
      number: (202500 + i + 1).toString(),
      name: u.name,
      email: u.email,
      course: "",
      year: "",
      attendance: "",
      grade: ""
    })));
  } else {
    setStudents([]);
  }
}

// ===== Section Switching =====
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const appSection = document.getElementById("app-section");
const dashboardSection = document.getElementById("dashboard");
const studentTableSection = document.getElementById("student-table");

document.getElementById("goRegister").onclick = () => {
  loginSection.classList.add("hidden");
  registerSection.classList.remove("hidden");
};
document.getElementById("goLogin").onclick = () => {
  registerSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
};

// ===== Login =====
document.getElementById("loginForm").onsubmit = (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const role = document.getElementById("login-role").value;
  const users = getUsers();
  const user = users.find(u => (u.email === username || u.name === username) && u.password === password && u.role === role);
  if (!user) {
    alert("Invalid credentials or role.");
    return;
  }
  setSession(user);
  loginSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  buildUI(user);
};

// ===== Register =====
document.getElementById("registerForm").onsubmit = (e) => {
  e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pass = document.getElementById("reg-pass").value;
  const conf = document.getElementById("reg-conf").value;
  const role = document.getElementById("reg-role").value;
  if (pass !== conf) {
    alert("Passwords do not match.");
    return;
  }
  const users = getUsers();
  if (users.some(u => u.email === email)) {
    alert("Email already registered.");
    return;
  }
  users.push({ name, email, password: pass, role });
  setUsers(users);

  // === Automatically add student to records if role is Student ===
  if (role === "Student") {
    let students = getStudents();
    if (!students.some(s => s.email === email)) {
      const nextNumber = (202500 + students.length + 1).toString();
      students.push({
        number: nextNumber,
        name: name,
        email: email,
        course: "",
        year: "",
        attendance: "",
        grade: ""
      });
      setStudents(students);
    }
  }

  alert("User registered! Now login.");
  registerSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
};

// ===== Build UI =====
function buildUI(user){
  document.getElementById("topNav").innerHTML = `
    <li><a href="#" onclick="showSection('dashboard')">Dashboard</a></li>
    ${user.role!=="Student"?'<li><a href="#" onclick="showSection(\'student-table\')">Students</a></li>':""}
    <li><span style="margin-right:10px;">${user.name} (${user.role})</span></li>
    <li><a href="#" class="btnlink" onclick="logout()">Logout</a></li>
  `;
  document.getElementById("sidebarMenu").innerHTML = `
    <li><a href="#" onclick="showSection('dashboard')">➤ Dashboard</a></li>
    ${user.role!=="Student"?'<li><a href="#" onclick="showSection(\'student-table\')">➤ Student Records</a></li>':""}
    <li><a href="#" onclick="showProfile()">➤ Profile</a></li>
    <li><a href="#" onclick="showChangePassword()">➤ Change Password</a></li>
  `;
  document.getElementById("dashboardCards").innerHTML = `
    <div class="card"><h3>Total Students</h3><p>${getStudents().length}</p></div>
    <div class="card"><h3>Avg Attendance</h3><p>${averageAttendance()}%</p></div>
    ${user.role === "Teacher" || user.role === "Admin" ? renderPassRateCard() : ""}
    ${user.role === "Student" ? renderStudentInfoCard(user) : ""}
  `;
  renderStudentTable(user);
  showSection('dashboard');
  // Show Add Student button only for Admin
  const addBtn = document.getElementById("addStudentBtn");
  if (addBtn) {
    addBtn.style.display = (user.role === "Admin") ? "inline-block" : "none";
    addBtn.onclick = function() {
      addStudentForm();
    };
  }
}

// helper function
function renderPassRateCard() {
  const students = getStudents();
  // passing is when grade >= 50%
  let passed = 0, total = 0;
  students.forEach(s => {
    if (s.grade) {
      const gradeNum = parseInt(s.grade.replace('%',''));
      if (!isNaN(gradeNum)) {
        total++;
        if (gradeNum >= 50) passed++;
      }
    }
  });
  const percent = total ? Math.round((passed/total)*100) : 0;
  return `
    <div class="card">
      <h3>Pass Rate</h3>
      <p>${percent}% of students passed</p>
      <small>(Grade ≥ 50%)</small>
    </div>
  `;
}

function renderStudentInfoCard(user) {
  const students = getStudents();
  const student = students.find(s => s.email === user.email);
  if (!student) return "";
  return `
    <div class="card">
      <h3>Your Academic Info</h3>
      <p><strong>Course:</strong> ${student.course || "N/A"}</p>
      <p><strong>Year:</strong> ${student.year || "N/A"}</p>
      <p><strong>Grade:</strong> ${student.grade || "N/A"}</p>
    </div>
  `;
}

function averageAttendance() {
  const students = getStudents();
  if (!students.length) return "0";
  let total = 0, count = 0;
  students.forEach(s => {
    const att = parseInt(s.attendance);
    if (!isNaN(att)) { total += att; count++; }
  });
  return count ? Math.round(total/count) : "0";
}

// Search and Filter
let studentSearchTerm = "";
function renderStudentTable(user) {
  const students = getStudents();
  const body = document.getElementById("studentTableBody");
  let filtered = students;
  if (user.role === "Student") {
    filtered = students.filter(s => s.email === user.email);
  } else if (studentSearchTerm) {
    filtered = students.filter(s =>
      s.name.toLowerCase().includes(studentSearchTerm) ||
      s.email.toLowerCase().includes(studentSearchTerm) ||
      s.number.includes(studentSearchTerm)
    );
  }
  body.innerHTML = filtered.map((s) =>
    `<tr>
      <td>${s.number}</td>
      <td>${s.name}</td>
      <td>${s.course}</td>
      <td>${s.year}</td>
      <td>${s.attendance}</td>
      <td>${s.grade}</td>
      ${user.role !== "Student" ? `<td>
        <button class="btn" onclick="editStudent('${s.number}')">Edit</button>
        <button class="btn" style="background:#e74c3c;margin-left:5px;" onclick="deleteStudent('${s.number}')">Delete</button>
      </td>` : ""}
    </tr>`
  ).join("");
  // table header for edit n delete if teacher oradmin
  const thead = body.parentElement.querySelector("thead tr");
  if (user.role !== "Student" && !thead.querySelector(".edit-header")) {
    thead.innerHTML += `<th class="edit-header">Actions</th>`;
  }
  if (user.role === "Student" && thead.querySelector(".edit-header")) {
    thead.querySelector(".edit-header").remove();
  }
  // Show search bar for admin or teacher
  let searchBar = document.getElementById("studentSearchBar");
  if (user.role !== "Student") {
    if (!searchBar) {
      searchBar = document.createElement("input");
      searchBar.id = "studentSearchBar";
      searchBar.placeholder = "Search by name, email, or #";
      searchBar.style = "margin-bottom:10px;width:250px;";
      searchBar.oninput = function() {
        studentSearchTerm = this.value.trim().toLowerCase();
        renderStudentTable(getSession());
      };
      body.parentElement.parentElement.insertBefore(searchBar, body.parentElement);
    }
    searchBar.classList.remove("hidden");
  } else if (searchBar) {
    searchBar.classList.add("hidden");
  }
}

// Edit Student records
window.editStudent = function(studentNumber) {
  const students = getStudents();
  const idx = students.findIndex(s => s.number === studentNumber);
  if (idx === -1) return;
  const s = students[idx];
  showStudentModal("Edit Student", s, function(updated) {
    students[idx] = { ...s, ...updated };
    setStudents(students);
    renderStudentTable(getSession());
    document.getElementById("dashboardCards").innerHTML = `
      <div class="card"><h3>Total Students</h3><p>${students.length}</p></div>
      <div class="card"><h3>Avg Attendance</h3><p>${averageAttendance()}%</p></div>
    `;
  });
};

//  Delete Student
window.deleteStudent = function(studentNumber) {
  if (!confirm("Are you sure you want to delete this student record?")) return;
  let students = getStudents();
  const idx = students.findIndex(s => s.number === studentNumber);
  if (idx === -1) return;
  students.splice(idx, 1);
  setStudents(students);
  renderStudentTable(getSession());
  document.getElementById("dashboardCards").innerHTML = `
    <div class="card"><h3>Total Students</h3><p>${students.length}</p></div>
    <div class="card"><h3>Avg Attendance</h3><p>${averageAttendance()}%</p></div>
  `;
};

// Student Form
function addStudentForm() {
  const container = document.getElementById("addStudentFormContainer");
  container.innerHTML = ""; // Clear any existing form
  const form = document.createElement("form");
  form.id = "addStudentForm";
  form.innerHTML = `
    <h3>Add Student</h3>
    <div class="form-group"><input type="text" placeholder="Student Email" required name="email" id="student-email"></div>
    <div id="student-extra-fields"></div>
    <div class="form-group"><input type="text" placeholder="Student #" required name="number"></div>
    <div class="form-group"><input type="text" placeholder="Course" required name="course"></div>
    <div class="form-group"><input type="text" placeholder="Year" required name="year"></div>
    <div class="form-group"><input type="number" min="0" max="100" placeholder="Attendance (%)" required name="attendance"></div>
    <div class="form-group"><input type="number" min="0" max="100" placeholder="Grade (%)" required name="grade"></div>
    <button type="submit" class="btn">Add Student</button>
    <button type="button" class="btn" id="cancelAddStudent" style="background:#e74c3c;margin-left:10px;">Cancel</button>
  `;

  form.querySelector("#student-email").addEventListener("blur", function() {
    const email = this.value.trim();
    const users = getUsers();
    const studentUser = users.find(u => u.email === email && u.role === "Student");
    const extraFields = form.querySelector("#student-extra-fields");
    if (!studentUser) {
      extraFields.innerHTML = `
        <div class="form-group"><input type="text" placeholder="Full Name" required name="name"></div>
        <div class="form-group"><input type="password" placeholder="Set Password" required name="password"></div>
      `;
    } else {
      extraFields.innerHTML = `
        <div class="form-group"><input type="text" value="${studentUser.name}" readonly name="name"></div>
      `;
    }
  });

  form.onsubmit = function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const users = getUsers();
    let studentUser = users.find(u => u.email === data.email && u.role === "Student");
    if (!studentUser) {
      if (!data.name || !data.password) {
        alert("Please enter name and password to register the student.");
        return;
      }
      if (users.some(u => u.email === data.email)) {
        alert("Email already registered with another role.");
        return;
      }
      studentUser = { name: data.name, email: data.email, password: data.password, role: "Student" };
      users.push(studentUser);
      setUsers(users);
      alert("Student registered as user!");
    }
    if (!/^\d+$/.test(data.number)) { alert("Student # must be numeric."); return; }
    if (isNaN(data.attendance) || data.attendance < 0 || data.attendance > 100) { alert("Attendance must be a number between 0 and 100."); return; }
    if (isNaN(data.grade) || data.grade < 0 || data.grade > 100) { alert("Grade must be a number between 0 and 100."); return; }
    const students = getStudents();
    if (students.some(s => s.number === data.number)) {
      alert("Student # already exists.");
      return;
    }
    students.push({
      number: data.number,
      name: studentUser.name,
      email: studentUser.email,
      course: data.course,
      year: data.year,
      attendance: `${data.attendance}%`,
      grade: `${data.grade}%`
    });
    setStudents(students);
    renderStudentTable(getSession());
    document.getElementById("dashboardCards").innerHTML = `
      <div class="card"><h3>Total Students</h3><p>${students.length}</p></div>
      <div class="card"><h3>Avg Attendance</h3><p>${averageAttendance()}%</p></div>
    `;
    form.reset();
    form.querySelector("#student-extra-fields").innerHTML = "";
    container.innerHTML = ""; // Hide the form after adding
  };

  form.querySelector("#cancelAddStudent").onclick = function() {
    container.innerHTML = "";
  };

  container.appendChild(form);
}

//  place for Editing Student
function showStudentModal(title, student, onSave) {
  const modal = document.getElementById("studentModal");
  const form = modal.querySelector("form");
  modal.querySelector(".modal-title").textContent = title;
  form.querySelector("[name='number']").value = student.number;
  form.querySelector("[name='name']").value = student.name;
  form.querySelector("[name='course']").value = student.course;
  form.querySelector("[name='year']").value = student.year;
  form.querySelector("[name='attendance']").value = student.attendance ? student.attendance.replace('%', '') : '';
  form.querySelector("[name='grade']").value = student.grade ? student.grade.replace('%', '') : '';
  modal.classList.remove("hidden");
  form.onsubmit = function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!/^\d+$/.test(data.number)) { alert("Student # must be numeric."); return; }
    if (isNaN(data.attendance) || data.attendance < 0 || data.attendance > 100) { alert("Attendance must be a number between 0 and 100."); return; }
    if (isNaN(data.grade) || data.grade < 0 || data.grade > 100) { alert("Grade must be a number between 0 and 100."); return; }
    modal.classList.add("hidden");

    // Store as percentage string
    data.attendance = `${data.attendance}%`;
    data.grade = `${data.grade}%`;
    onSave(data);
  };
  modal.querySelector(".close-modal").onclick = function() {
    modal.classList.add("hidden");
  };
}

// Profile Page or what what
window.showProfile = function() {
  const user = getSession();
  const modal = document.getElementById("profileModal");
  modal.querySelector("[name='name']").value = user.name;
  modal.querySelector("[name='email']").value = user.email;
  modal.classList.remove("hidden");
  modal.onsubmit = function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(modal));
    let users = getUsers();
    const idx = users.findIndex(u => u.email === user.email && u.role === user.role);
    if (idx !== -1) {
      users[idx].name = data.name;
      users[idx].email = data.email;
      setUsers(users);
      setSession(users[idx]);
      alert("Profile updated!");
      modal.classList.add("hidden");
      buildUI(users[idx]);
    }
  };
  modal.querySelector(".close-modal").onclick = function() {
    modal.classList.add("hidden");
  };
};

//  Change Password
window.showChangePassword = function() {
  const user = getSession();
  const modal = document.getElementById("passwordModal");
  // Reset all input fields in the what what place
  Array.from(modal.querySelectorAll("input")).forEach(input => input.value = "");
  modal.classList.remove("hidden");
  modal.onsubmit = function(e) {
    e.preventDefault();
    const oldPass = modal.querySelector("[name='oldpass']").value;
    const newPass = modal.querySelector("[name='newpass']").value;
    const confPass = modal.querySelector("[name='confpass']").value;
    if (newPass !== confPass) {
      alert("Passwords do not match.");
      return;
    }
    let users = getUsers();
    const idx = users.findIndex(u => u.email === user.email && u.role === user.role);
    if (idx !== -1 && users[idx].password === oldPass) {
      users[idx].password = newPass;
      setUsers(users);
      alert("Password changed!");
      modal.classList.add("hidden");
    } else {
      alert("Old password incorrect.");
    }
  };
  modal.querySelector(".close-modal").onclick = function() {
    modal.classList.add("hidden");
  };
};

//  Navigation
window.showSection = function(sectionId) {
  dashboardSection.classList.add("hidden");
  studentTableSection.classList.add("hidden");
  if (sectionId === "dashboard") dashboardSection.classList.remove("hidden");
  if (sectionId === "student-table") studentTableSection.classList.remove("hidden");
};

// Logout
window.logout = function() {
  clearSession();
  appSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
};

// Auto-login if session exists
window.onload = function() {
  const user = getSession();
  if (user) {
    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    buildUI(user);
  }
};