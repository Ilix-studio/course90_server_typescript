// Helper function to get amount from time period
const getAmountFromTimePeriod = (timePeriod: string): number => {
  switch (timePeriod) {
    case "1month":
      return 99;
    case "4months":
      return 399;
    case "8months":
      return 799;
    case "1year":
      return 999;
    default:
      throw new Error("Invalid time period");
  }
};
