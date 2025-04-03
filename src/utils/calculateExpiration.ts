// Helper function to calculate expiration date
export const calculateExpirationDate = (timePeriod: string): Date => {
  const now = new Date();
  const expiresAt = new Date(now);

  switch (timePeriod) {
    case "1month":
      expiresAt.setMonth(now.getMonth() + 1);
      break;
    case "4months":
      expiresAt.setMonth(now.getMonth() + 3);
      break;
    case "8months":
      expiresAt.setMonth(now.getMonth() + 6);
      break;
    case "1year":
      expiresAt.setFullYear(now.getFullYear() + 1);
      break;
    default:
      throw new Error("Invalid time period");
  }

  return expiresAt;
};
