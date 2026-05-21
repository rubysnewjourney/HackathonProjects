/** Mock OHCS / DPA / property tax calculators */

export function calculateMonthlyPayment(principal, annualRate, years) {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function queryFinanceProfile(propertyRecord, buyerProfile = {}) {
  const { finance, legal, property_metadata } = propertyRecord;
  const listPrice = property_metadata.list_price;
  const downPayment = buyerProfile.down_payment ?? listPrice * 0.05;
  const annualIncome = buyerProfile.household_income ?? 85000;
  const isFirstTime = buyerProfile.first_time_buyer !== false;

  const loanAmount = listPrice - downPayment;
  const rate = buyerProfile.interest_rate ?? 0.0675;
  const principalInterest = calculateMonthlyPayment(loanAmount, rate, 30);
  const annualTax = legal.assessed_value * finance.millage_rate;
  const monthlyTax = annualTax / 12;

  const trueMonthlyCost =
    principalInterest +
    monthlyTax +
    finance.estimated_insurance_monthly +
    finance.hoa_monthly +
    finance.estimated_utilities_monthly;

  const programs = isFirstTime
    ? finance.eligible_programs.filter((p) => {
        if (annualIncome > 120000 && p.program_id.includes("DPA")) return false;
        return true;
      })
    : [];

  return {
    source: "OHCS / Portland DPA / County Millage Mock APIs",
    list_price: listPrice,
    down_payment: downPayment,
    loan_amount: loanAmount,
    interest_rate: rate,
    is_first_time_buyer: isFirstTime,
    household_income: annualIncome,
    cost_breakdown: {
      principal_interest: Math.round(principalInterest * 100) / 100,
      property_tax: Math.round(monthlyTax * 100) / 100,
      insurance: finance.estimated_insurance_monthly,
      hoa: finance.hoa_monthly,
      utilities: finance.estimated_utilities_monthly,
    },
    tax_breakdown: {
      assessed_value: legal.assessed_value,
      millage_rate: finance.millage_rate,
      estimated_annual_tax: Math.round(annualTax),
    },
    true_monthly_cost: Math.round(trueMonthlyCost * 100) / 100,
    eligible_assistance_programs: programs,
    neighborhood_median_tax_annual: property_metadata.neighborhood_median_tax_annual,
  };
}
