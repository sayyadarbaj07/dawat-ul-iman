const getGradeFromPercentage = (percentage) => {
  if (percentage >= 80) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  if (percentage >= 33) return "E";
  return "F";
};

const calculateResult = ({ marks, maxMarks, passingMarks }) => {
  const percentage = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
  const passed = marks >= passingMarks;
  const status = passed ? "Pass" : "Fail";
  const grade = passed ? getGradeFromPercentage(percentage) : "F";

  return {
    percentage,
    grade,
    passed,
    status
  };
};

module.exports = {
  calculateResult,
  getGradeFromPercentage
};
