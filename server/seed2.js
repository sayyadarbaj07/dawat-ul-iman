const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/dawatuliman').then(async () => {
    try {
        const c = mongoose.connection.db.collection('classes');
        const s = mongoose.connection.db.collection('students');
        const e = mongoose.connection.db.collection('exams');
        const er = mongoose.connection.db.collection('examresults');
        const a = mongoose.connection.db.collection('attendances');
        const t = mongoose.connection.db.collection('transactions');
        const u = mongoose.connection.db.collection('users');

        const qaAdminId = new mongoose.Types.ObjectId();
        await u.insertOne({ _id: qaAdminId, name: "QA Admin", username: "qa_admin", email: "qa-admin@test.com", password: "password123", role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date() });

        const qaTeacherId = new mongoose.Types.ObjectId();
        await u.insertOne({ _id: qaTeacherId, name: "QA Teacher", username: "qa_teacher", email: "qa-teacher@test.com", password: "password123", role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() });

        const qaClassId = new mongoose.Types.ObjectId();
        await c.insertOne({ _id: qaClassId, name: "QA-Test-Class", department: "Hifz", description: "QA Class for Testing", teachers: [qaTeacherId], status: "active", subjects: ["Math", "Urdu", "Arabic"], createdAt: new Date(), updatedAt: new Date() });

        const qaStudentEnId = new mongoose.Types.ObjectId();
        await s.insertOne({ _id: qaStudentEnId, name: "QA Student English", rollNumber: "QA-001", classId: qaClassId, className: "QA-Test-Class", status: "active", phone: "1234567890", fatherName: "QA Father", dateOfBirth: new Date("2010-01-01"), admissionDate: new Date(), createdAt: new Date(), updatedAt: new Date() });

        const qaStudentUrId = new mongoose.Types.ObjectId();
        await s.insertOne({ _id: qaStudentUrId, name: "کیو اے طالب علم اردو", nameUrdu: "کیو اے طالب علم اردو", rollNumber: "QA-002", classId: qaClassId, className: "QA-Test-Class", status: "active", phone: "0987654321", fatherName: "QA Father UR", dateOfBirth: new Date("2010-02-01"), admissionDate: new Date(), createdAt: new Date(), updatedAt: new Date() });

        const qaExamId = new mongoose.Types.ObjectId();
        await e.insertOne({ _id: qaExamId, name: "QA Test Exam Monthly", examType: "monthly", classId: qaClassId, class: "QA-Test-Class", date: new Date(), subjects: ["Math", "Urdu", "Arabic"], maxMarks: 100, status: "completed", createdAt: new Date(), updatedAt: new Date() });

        await er.insertMany([
            { examId: qaExamId, studentId: qaStudentEnId, classId: qaClassId, marks: { "Math": 85, "Urdu": 90, "Arabic": 78 }, totalMarks: 253, percentage: 84.33, grade: "A", status: "pass", date: new Date() },
            { examId: qaExamId, studentId: qaStudentUrId, classId: qaClassId, marks: { "Math": 40, "Urdu": 45, "Arabic": 35 }, totalMarks: 120, percentage: 40.00, grade: "D", status: "fail", date: new Date() }
        ]);

        await a.insertMany([
            { classId: qaClassId, studentId: qaStudentEnId, date: new Date(), status: "present", isQa: true },
            { classId: qaClassId, studentId: qaStudentUrId, date: new Date(), status: "absent", isQa: true }
        ]);

        await t.insertMany([
            { type: "income", amount: 5000, category: "Atiya", description: "QA Atiya Donation", date: new Date(), status: "completed", paymentMethod: "cash", isQa: true },
            { type: "expense", amount: 2000, category: "Salaries", description: "QA Teacher Salary", date: new Date(), status: "completed", paymentMethod: "bank", isQa: true }
        ]);

        console.log("Seeded successfully via native mongodb driver");
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
});
