// Simple test to verify month generation logic
function generateMonths(from, to) {
    const allMonths = new Set();
    if (from && to) {
        const startDate = new Date(from);
        const endDate = new Date(to);

        // Set start date to first day of the month
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        // Set end date to first day of the next month to include the current month
        endDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setHours(0, 0, 0, 0);

        const currentDate = new Date(startDate);
        while (currentDate < endDate) {
            const monthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM format
            allMonths.add(monthKey);
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }
    return Array.from(allMonths).sort();
}

// Test cases
console.log("Test 1: Full year 2024");
console.log(generateMonths("2024-01-01", "2024-12-31"));

console.log("\nTest 2: Partial year 2024");
console.log(generateMonths("2024-03-15", "2024-08-20"));

console.log("\nTest 3: Cross year");
console.log(generateMonths("2023-11-01", "2024-02-28"));

console.log("\nTest 4: Single month");
console.log(generateMonths("2024-06-01", "2024-06-30")); 