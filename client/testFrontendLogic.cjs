// Simulate the frontend filtering logic

const assert = require("assert");

function testAttendanceFrontendLogic(user, allTeachers, activeApiClasses) {
  let assignedClasses = [];
  let classFilter = "";
  
  const me = allTeachers.find(t => (t.userId?._id === user.id) || (t.userId === user.id));
  if (me) {
    let teacherClasses = [];
    if (me.assignedClassIds && me.assignedClassIds.length > 0) {
      teacherClasses = activeApiClasses.filter(c => me.assignedClassIds.includes(c._id));
    } else if (me.assignedClasses && me.assignedClasses.length > 0) {
      teacherClasses = activeApiClasses.filter(c => me.assignedClasses.includes(c.department) || me.assignedClasses.includes(c.name));
    }
    
    if (teacherClasses.length > 0) {
      assignedClasses = teacherClasses;
      classFilter = teacherClasses[0]?._id || "";
    } else {
      assignedClasses = [];
      classFilter = "";
    }
  } else {
    assignedClasses = [];
    classFilter = "";
  }
  
  return { assignedClasses, classFilter };
}

// Data
const activeApiClasses = [
  { _id: "class_1", department: "alimiyat", name: "awwal" },
  { _id: "class_2", department: "hifz", name: "alif" }
];

// Test 1: New teacher with assignedClassIds -> assigned class appears
const user1 = { id: "user_1", role: "teacher" };
const allTeachers1 = [
  { _id: "teacher_1", userId: "user_1", assignedClassIds: ["class_1"], assignedClasses: ["alimiyat"] }
];
const result1 = testAttendanceFrontendLogic(user1, allTeachers1, activeApiClasses);
assert(result1.assignedClasses.length === 1 && result1.assignedClasses[0]._id === "class_1", "Test 1 Failed");
console.log("PASS: New teacher with assignedClassIds -> assigned class appears");

// Test 2: Teacher with legacy assignedClasses -> legacy fallback works
const user2 = { id: "user_2", role: "teacher" };
const allTeachers2 = [
  { _id: "teacher_2", userId: "user_2", assignedClassIds: [], assignedClasses: ["hifz"] }
];
const result2 = testAttendanceFrontendLogic(user2, allTeachers2, activeApiClasses);
assert(result2.assignedClasses.length === 1 && result2.assignedClasses[0]._id === "class_2", "Test 2 Failed");
console.log("PASS: Teacher with legacy assignedClasses -> legacy fallback still works");

// Test 3: Teacher with no assignments -> "You are not assigned..." (empty array)
const user3 = { id: "user_3", role: "teacher" };
const allTeachers3 = [
  { _id: "teacher_3", userId: "user_3", assignedClassIds: [], assignedClasses: [] }
];
const result3 = testAttendanceFrontendLogic(user3, allTeachers3, activeApiClasses);
assert(result3.assignedClasses.length === 0, "Test 3 Failed");
console.log("PASS: Teacher with no assignments -> empty array (shows unassigned message)");

console.log("All frontend logic tests passed successfully!");
