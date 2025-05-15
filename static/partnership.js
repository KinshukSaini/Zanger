// Document order configuration from partnership.json
const sectionOrder = [
  "Background",
  "Partnership details",
  "Place of business",
  "Term",
  "Partners' Capital Contributions",
  "Partner's Capital Accounts",
  "Profits and losses",
  "Partner's Income Accounts",
  "Partner's Salary and Drawings",
  "Partnership Bank Accounts",
  "Partnership Books and Records",
  "Management",
  "Voluntary Dissolution of Partnership",
  "Partner's withdrawal",
  "Involuntary Withdrawal",
  "Partner's Retirement",
  "Partner's Death",
  "Buyout",
  "Buyout Price Assessment",
  "Restriction on Transfer",
  "New Partners",
  "Arbitration",
  "Binding Effect",
  "Severability",
  "Governing Law",
  "Further Assurances",
  "Headings",
  "Entire Agreement",
  "Counterparts",
  "Amendment",
  "Notices",
  "Waiver",
  "SIGNATURES"
];

// Store form data
let formDataStore = {};
let documentTemplate; // To store the initial structure

// --- Reusable Utility Functions (Mostly similar to licensing.js) ---
function flattenObject(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else {
      acc[prefixedKey] = obj[key];
    }
    return acc;
  }, {});
}

function unflattenObject(flatObj) {
  const result = {};
  Object.keys(flatObj).forEach((key) => {
    const value = flatObj[key];
    const keys = key.split(".");
    let current = result;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        current[k] = value;
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
    });
  });
  return result;
}

function initializeDocumentTemplate() {
  if (window.currentDocument) {
    documentTemplate = JSON.parse(JSON.stringify(window.currentDocument));
  } else {
    console.error("window.currentDocument is not defined for partnership agreement.");
    documentTemplate = { "Partnership Agreement": {} }; // Fallback
  }
}

function getDocumentTemplate() {
  if (!documentTemplate) {
    initializeDocumentTemplate();
  }
  return JSON.parse(JSON.stringify(documentTemplate));
}

function formatDate(dateStr) {
  if (!dateStr) return "*[INSERT DATE]*";
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`; // Adjust format as needed
}
// --- End Reusable Utility Functions ---

// Predefined questions for the partnership document
const documentQuestions = {
  step1: {
    title: "Agreement Basics",
    agreementDate: { question: "Enter the date of agreement:", type: "date" },
    partnershipName: { question: "Partnership Name:", type: "text" },
    governingCountry: { question: "Governing Country:", type: "text" },
    businessPurpose: { question: "Purpose of the Business:", type: "textarea" },
    principalOfficeAddress: { question: "Principal Office Address:", type: "textarea" },
    numberOfPartners: { question: "Number of Partners:", type: "number", min: 1, max: 10, default: 2 }
  },
  step2: {
    title: "Partner Details",
    // Dynamic partner fields will be generated here
  },
  step3: {
    title: "Term & Capital",
    termCommencementDate: { question: "Partnership Commencement Date:", type: "date" },
    termEndDateOrCondition: { question: "Partnership End Date or Condition (e.g., 2030-12-31 or 'terminated per agreement'):", type: "text" },
    capitalContributionDeadlineDays: { question: "Capital Contribution Deadline (days from Effective Date):", type: "number" },
    capitalContributionDeadlineDate: { question: "Capital Contribution Deadline (specific date):", type: "date" },
    // Dynamic contribution fields per partner will be generated here
  },
  step4: {
    title: "Accounts & Profits",
    capitalAccountInterest: { question: "Interest on Partner Capital Accounts:", type: "select", options: ["Paid at rate determined by Partners", "No interest paid"] },
    profitLossDivision: { question: "Net Profit and Loss Division:", type: "select", options: ["Equally between Partners", "Proportionate to capital contributions"] },
    incomeAccountInterest: { question: "Interest on Partner Income Accounts:", type: "select", options: ["Paid at rate determined by Partners", "No interest paid"] },
    profitWithdrawalPolicy: { question: "Partner Profit Withdrawal Policy:", type: "select", options: ["Any time", "Any time with prior written consent of all Partners", "Distributed at end of timescale"] },
    profitWithdrawalTimescale: { question: "If profits distributed, specify timescale (e.g., quarter, year):", type: "text", condition: {field: "profitWithdrawalPolicy", value: "Distributed at end of timescale"} },
  },
  step5: {
    title: "Banking & Records",
    bankAccountDetails: { question: "Partnership Bank Account Details (e.g., Bank Name, Branch):", type: "text" },
    booksLocation: { question: "Location of Partnership Books and Records:", type: "text" },
    booksInspection: { question: "Book Inspection Rights:", type: "select", options: ["Any Partner or representative", "Any Partner during business hours with notice"] },
    fiscalYearStart: { question: "Fiscal Year Start Date (e.g., 01-01):", type: "text", placeholder: "MM-DD" },
    fiscalYearEnd: { question: "Fiscal Year End Date (e.g., 12-31):", type: "text", placeholder: "MM-DD" },
    annualReportMonths: { question: "Months to prepare annual report after fiscal year end:", type: "number", min:1, max:12 },
  },
  step6: {
    title: "Management & Dissolution",
    managementDecisionPower: { question: "Partner Decision Making Power:", type: "select", options: ["Only significant decisions", "Only ordinary decisions", "Significant and ordinary decisions"] },
    dissolutionConsent: { question: "Consent required for Voluntary Dissolution:", type: "select", options: ["All Partners", "A majority of Partners", "Other (specify)"] },
    dissolutionConsentOther: { question: "Specify other consent for dissolution:", type: "text", condition: {field: "dissolutionConsent", value: "Other (specify)"} },
  },
  step7: { 
    title: "New Partners & Legal",
    newPartnerAdmissionPolicy: { question: "Admission of New Partners:", type: "select", options: ["Unanimous consent", "Majority consent", "Not permitted", "Other terms (specify)"] },
    newPartnerAdmissionTerms: { question: "Specify other terms for new partner admission:", type: "text", condition: {field: "newPartnerAdmissionPolicy", value: "Other terms (specify)"} },
    governingLaw: { question: "Governing Law (e.g., State of California, USA):", type: "text" },
    arbitrationDetails: { question: "Arbitration Details (e.g., Location like 'City, State'):", type: "text"},
    arbitrationRules: { question: "Arbitration Rules (e.g., AAA, JAMS):", type: "text"},
  },
  step8: {
    title: "Partner Events (Withdrawal, Retirement, Buyout, etc.)",
    withdrawalNoticeDays: { question: "Days of notice for partner withdrawal:", type: "number", min: 0 },
    withdrawalNoticeType: { question: "Type of notice for withdrawal (e.g., written notice):", type: "text", placeholder: "written notice" },
    withdrawalReason: { question: "Permitted reason(s) for partner withdrawal:", type: "text", placeholder: "e.g., any reason, specific conditions" },
    
    retirementConditionPolicy: { 
      question: "Conditions for Partner Retirement:", 
      type: "select", 
      options: ["Upon reaching a specific age", "After a specific period of service", "As per mutual agreement", "Other conditions (specify)"] 
    },
    retirementSpecificAge: { 
      question: "Specify retirement age:", 
      type: "number", 
      min: 0, 
      condition: { field: "retirementConditionPolicy", value: "Upon reaching a specific age" } 
    },
    retirementServiceYears: { 
      question: "Specify years of service for retirement:", 
      type: "number", 
      min: 0, 
      condition: { field: "retirementConditionPolicy", value: "After a specific period of service" } 
    },
    retirementConditionOther: { 
      question: "Specify other retirement conditions:", 
      type: "text", 
      condition: { field: "retirementConditionPolicy", value: "Other conditions (specify)" } 
    },

    buyoutValuationMethod: {
      question: "Method for Buyout Price Valuation:",
      type: "select",
      options: ["Independent appraisal", "Book value", "Agreed formula (specify)", "Other method (specify)"]
    },
    buyoutValuationFormula: {
      question: "Specify agreed formula for valuation:",
      type: "textarea",
      condition: { field: "buyoutValuationMethod", value: "Agreed formula (specify)"}
    },
    buyoutValuationOther: {
      question: "Specify other valuation method:",
      type: "textarea",
      condition: { field: "buyoutValuationMethod", value: "Other method (specify)"}
    }
    // Add questions for Involuntary Withdrawal, Death, Restriction on Transfer here
  }
};

// Maps questionnaire field IDs to document paths (simplified, needs expansion)
const documentPathMap = {
  agreementDate: ["Partnership Agreement.Background.content"],
  partnershipName: ["Partnership Agreement.Partnership details.1.content"],
  governingCountry: ["Partnership Agreement.Partnership details.1.content"],
  businessPurpose: ["Partnership Agreement.Partnership details.1.content"],
  principalOfficeAddress: ["Partnership Agreement.Place of business.2.content"],
  
  termCommencementDate: ["Partnership Agreement.Term.3.content"],
  termEndDateOrCondition: ["Partnership Agreement.Term.3.content"],
  
  capitalContributionDeadlineDays: ["Partnership Agreement.Partners' Capital Contributions.4.content"],
  capitalContributionDeadlineDate: ["Partnership Agreement.Partners' Capital Contributions.4.content"],

  capitalAccountInterest: ["Partnership Agreement.Partner's Capital Accounts.8"], 
  profitLossDivision: ["Partnership Agreement.Profits and losses.9.content"],
  incomeAccountInterest: ["Partnership Agreement.Partner's Income Accounts.10"],
  profitWithdrawalPolicy: ["Partnership Agreement.Partner's Salary and Drawings.Profits.12"],
  profitWithdrawalTimescale: ["Partnership Agreement.Partner's Salary and Drawings.Profits.12.option3"],


  bankAccountDetails: ["Partnership Agreement.Partnership Bank Accounts.13.content"],
  booksLocation: ["Partnership Agreement.Partnership Books and Records.14.content"],
  booksInspection: ["Partnership Agreement.Partnership Books and Records.15"],
  fiscalYearStart: ["Partnership Agreement.Partnership Books and Records.17.content"],
  fiscalYearEnd: ["Partnership Agreement.Partnership Books and Records.17.content"],
  annualReportMonths: ["Partnership Agreement.Partnership Books and Records.17.content"],

  managementDecisionPower: ["Partnership Agreement.Management.19.content"],
  dissolutionConsent: ["Partnership Agreement.Voluntary Dissolution of Partnership.21.content"],
  dissolutionConsentOther: ["Partnership Agreement.Voluntary Dissolution of Partnership.21.content"],

  newPartnerAdmissionPolicy: ["Partnership Agreement.New Partners.31.content"],
  newPartnerAdmissionTerms: ["Partnership Agreement.New Partners.31.content"],
  governingLaw: ["Partnership Agreement.Governing Law.35.content"],
  arbitrationDetails: ["Partnership Agreement.Arbitration.32.content"],
  arbitrationRules: ["Partnership Agreement.Arbitration.32.content"],

  withdrawalNoticeDays: ["Partnership Agreement.Partner's withdrawal.22.content"],
  withdrawalNoticeType: ["Partnership Agreement.Partner's withdrawal.22.content"],
  withdrawalReason: ["Partnership Agreement.Partner's withdrawal.23.content"],

  retirementConditionPolicy: ["Partnership Agreement.Partner's Retirement.26.content"],
  retirementSpecificAge: ["Partnership Agreement.Partner's Retirement.26.content"],
  retirementServiceYears: ["Partnership Agreement.Partner's Retirement.26.content"],
  retirementConditionOther: ["Partnership Agreement.Partner's Retirement.26.content"],

  buyoutValuationMethod: ["Partnership Agreement.Buyout Price Assessment.29.content"],
  buyoutValuationFormula: ["Partnership Agreement.Buyout Price Assessment.29.content"],
  buyoutValuationOther: ["Partnership Agreement.Buyout Price Assessment.29.content"],
};


function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const docTitle = "Partnership Agreement";

  // Background
  if (formData.agreementDate) {
    const formattedDate = formatDate(formData.agreementDate);
    updatedFlatDoc[`${docTitle}.Background.content`] = `This Partnership Agreement ("Agreement") is made as of this ${formattedDate} between:`;
  }

  const numPartners = parseInt(formData.numberOfPartners, 10) || 0;
  const partnerLines = [];
  for (let i = 0; i < numPartners; i++) {
    const name = formData[`partnerName_${i + 1}`] || "__________________";
    const address = formData[`partnerAddress_${i + 1}`] || "_________________";
    let line = `${i === 0 ? "Partner(s) " : ""}${name} located at ${address}`;
    if (i === numPartners - 1) {
      line += ` (each, a "Partner" and collectively, the "Partners")`;
    }
    partnerLines.push(line);
  }
  if (numPartners > 0) {
     updatedFlatDoc[`${docTitle}.Background.partners`] = partnerLines;
  } else if (flatDoc[`${docTitle}.Background.partners`]) { 
     if (documentTemplate && documentTemplate[docTitle] && documentTemplate[docTitle].Background && documentTemplate[docTitle].Background.partners && documentTemplate[docTitle].Background.partners.length > 0) {
        updatedFlatDoc[`${docTitle}.Background.partners`] = [documentTemplate[docTitle].Background.partners[0]];
     } else {
        delete updatedFlatDoc[`${docTitle}.Background.partners`]; 
     }
  }

  // Partnership Details
  if (formData.partnershipName || formData.governingCountry || formData.businessPurpose) {
    const pName = formData.partnershipName || "*[INSERT NAME]*";
    const country = formData.governingCountry || "*[INSERT COUNTRY]*";
    const purpose = formData.businessPurpose || "*[INSERT BUSINESS]*";
    updatedFlatDoc[`${docTitle}.Partnership details.1.content`] = `The Partners agree to form a partnership under the name of ${pName}. The Partnership will be governed in accordance with the laws of ${country}. The Partnership is formed on the terms and conditions in the Agreement below, to engage the business of ${purpose} to engage in any and all necessary activities to carry on the business of the Partnership.`;
  }

  // Place of Business
  if (formData.principalOfficeAddress) {
    updatedFlatDoc[`${docTitle}.Place of business.2.content`] = `The principal office of the Partnership will be located at ${formData.principalOfficeAddress || "*[INSERT ADDRESS]*"}, or at such places as the Partners shall determine from time to time.`;
  }

  // Term
  if (formData.termCommencementDate || formData.termEndDateOrCondition) {
    const startDate = formatDate(formData.termCommencementDate);
    const endDateOrCond = formData.termEndDateOrCondition || "*[it is terminated in accordance with the terms of this agreement]*";
    updatedFlatDoc[`${docTitle}.Term.3.content`] = `The Partnership shall commence on ${startDate} and continue until ${endDateOrCond}.`;
  }
  
  // Capital Contributions
  if (formData.capitalContributionDeadlineDays || formData.capitalContributionDeadlineDate) {
      const days = formData.capitalContributionDeadlineDays || "*[DAYS]*";
      const date = formData.capitalContributionDeadlineDate ? formatDate(formData.capitalContributionDeadlineDate) : "*[DATE]*";
      updatedFlatDoc[`${docTitle}.Partners' Capital Contributions.4.content`] = `The Partners will contribute capital to the Partnership within ${days} of the Effective Date, on or before ${date}.`;
  }

  for (let charCode = 97; charCode <= 122; charCode++) { 
    const itemKey = String.fromCharCode(charCode);
    delete updatedFlatDoc[`${docTitle}.Partners' Capital Contributions.5.${itemKey}`];
  }
  for (let i = 0; i < numPartners; i++) {
    const partnerName = formData[`partnerName_${i + 1}`] || "*[NAME OF PARTNER]*";
    const cashAmount = formData[`partnerCashContribution_${i + 1}`] || "*[AMOUNT]*";
    const itemKey = String.fromCharCode(97 + i); 
    if (i < 4) { 
        updatedFlatDoc[`${docTitle}.Partners' Capital Contributions.5.${itemKey}`] = `${partnerName}, $${cashAmount}.`;
    }
  }
  for (let charCode = 97; charCode <= 122; charCode++) {
    const itemKey = String.fromCharCode(charCode);
    delete updatedFlatDoc[`${docTitle}.Partners' Capital Contributions.6.${itemKey}`];
  }
  for (let i = 0; i < numPartners; i++) {
    const partnerName = formData[`partnerName_${i + 1}`] || "*[NAME OF PARTNER]*";
    const nonCashDesc = formData[`partnerNonCashDescription_${i + 1}`] || "*[DESCRIPTION]*";
    const nonCashValue = formData[`partnerNonCashValue_${i + 1}`] || "*[AMOUNT]*";
    const itemKey = String.fromCharCode(97 + i);
    if (i < 4) { 
        updatedFlatDoc[`${docTitle}.Partners' Capital Contributions.6.${itemKey}`] = `${partnerName}, ${nonCashDesc}, $${nonCashValue}.`;
    }
  }

  // Partner's Capital Accounts (Section 8 - options)
  if (formData.capitalAccountInterest) {
    delete updatedFlatDoc[`${docTitle}.Partner's Capital Accounts.8.option1`];
    delete updatedFlatDoc[`${docTitle}.Partner's Capital Accounts.8.option2`];
    if (formData.capitalAccountInterest === "Paid at rate determined by Partners") {
      updatedFlatDoc[`${docTitle}.Partner's Capital Accounts.8.option1`] = "*[Interest will be paid on the capital account of any Partner at a rate determined by the Partners.]*";
    } else if (formData.capitalAccountInterest === "No interest paid") {
      updatedFlatDoc[`${docTitle}.Partner's Capital Accounts.8.option2`] = "*[No interest will be paid on the capital account of any Partner]*.";
    }
  }

  // Profits and losses (Section 9)
  if (formData.profitLossDivision) {
      if (formData.profitLossDivision === "Equally between Partners") {
          updatedFlatDoc[`${docTitle}.Profits and losses.9.content`] = "Net profits and losses will be divided *[Equally between the Partners]*.";
      } else if (formData.profitLossDivision === "Proportionate to capital contributions") {
          updatedFlatDoc[`${docTitle}.Profits and losses.9.content`] = "Net profits and losses will be divided *[according to the same proportion as the Partner's capital contributions to the Partnership]*.";
      }
  }

  // Partner's Income Accounts (Section 10 - options)
  if (formData.incomeAccountInterest) {
    delete updatedFlatDoc[`${docTitle}.Partner's Income Accounts.10.option1`];
    delete updatedFlatDoc[`${docTitle}.Partner's Income Accounts.10.option2`];
    if (formData.incomeAccountInterest === "Paid at rate determined by Partners") {
      updatedFlatDoc[`${docTitle}.Partner's Income Accounts.10.option1`] = "*[Interest, at the rates and times as determined by the Partners will be paid on the income account of any Partner.]*";
    } else if (formData.incomeAccountInterest === "No interest paid") {
      updatedFlatDoc[`${docTitle}.Partner's Income Accounts.10.option2`] = "*[No interest will be paid on the income account of any Partner.]*";
    }
  }

  // Partner's Salary and Drawings - Profits (Section 12)
  if (formData.profitWithdrawalPolicy) {
    delete updatedFlatDoc[`${docTitle}.Partner's Salary and Drawings.Profits.12.option1`];
    delete updatedFlatDoc[`${docTitle}.Partner's Salary and Drawings.Profits.12.option2`];
    delete updatedFlatDoc[`${docTitle}.Partner's Salary and Drawings.Profits.12.option3`];
    if (formData.profitWithdrawalPolicy === "Any time") {
      updatedFlatDoc[`${docTitle}.Partner's Salary and Drawings.Profits.12.option1`] = "*[A Partner may withdraw any portion of profits from their income account at any time]*";
    } else if (formData.profitWithdrawalPolicy === "Any time with prior written consent of all Partners") {
      updatedFlatDoc[`${docTitle}.Partner's Salary and Drawings.Profits.12.option2`] = "*[A Partner may withdraw any portion of profits from their income account at any time but only with the prior written consent of all Partner's]*";
    } else if (formData.profitWithdrawalPolicy === "Distributed at end of timescale") {
      const timescale = formData.profitWithdrawalTimescale || "[INSERT TIMESCALE]";
      updatedFlatDoc[`${docTitle}.Partner's Salary and Drawings.Profits.12.option3`] = `*[The Partnership will distribute profits to Partners at the end of each [${timescale}]]*`;
    }
  }


  // Partnership Bank Accounts (Section 13)
  if (formData.bankAccountDetails) {
    updatedFlatDoc[`${docTitle}.Partnership Bank Accounts.13.content`] = `The Partnership funds will be kept in an account in its name at ${formData.bankAccountDetails || "*[INSERT DETAILS]*"} or at any other institution as agreed between the Partners.`;
  }

  // Partnership Books and Records (Sections 14, 15, 17)
  if (formData.booksLocation) {
    updatedFlatDoc[`${docTitle}.Partnership Books and Records.14.content`] = `The Books and records of the Partnership will be kept and maintained at ${formData.booksLocation || "*[INSERT LOCATION]*"}.`;
  }
  if (formData.booksInspection) {
    delete updatedFlatDoc[`${docTitle}.Partnership Books and Records.15.option1`];
    delete updatedFlatDoc[`${docTitle}.Partnership Books and Records.15.option2`];
    if (formData.booksInspection === "Any Partner or representative") {
      updatedFlatDoc[`${docTitle}.Partnership Books and Records.15.option1`] = "Such books and records will be available for inspection by *[any Partner or his or her representative]*";
    } else if (formData.booksInspection === "Any Partner during business hours with notice") {
      updatedFlatDoc[`${docTitle}.Partnership Books and Records.15.option2`] = "*[any Partner during business hours with reasonable notice]*.";
    }
  }
  if (formData.fiscalYearStart || formData.fiscalYearEnd || formData.annualReportMonths) {
    const fyStart = formData.fiscalYearStart || "*[DATE]*";
    const fyEnd = formData.fiscalYearEnd || "*[DATE]*";
    const reportMonths = formData.annualReportMonths || "*[MONTHS]*";
    updatedFlatDoc[`${docTitle}.Partnership Books and Records.17.content`] = `The Partnership's fiscal year will begin on ${fyStart} and close on ${fyEnd}. An income statement and balance sheet will be prepared at the end of each fiscal year within ${reportMonths} after the end of the fiscal year.`;
  }

  // Management (Section 19)
  if (formData.managementDecisionPower) {
    let decisionText = "*[significant and ordinary decisions on behalf of the Partnership]*"; // Default
    if (formData.managementDecisionPower === "Only significant decisions") {
      decisionText = "*[only significant decisions on behalf of the Partnership]*";
    } else if (formData.managementDecisionPower === "Only ordinary decisions") {
      decisionText = "*[only ordinary decisions on behalf of the Partnership]*";
    }
    updatedFlatDoc[`${docTitle}.Management.19.content`] = `Each Partner has the power to make ${decisionText}.`;
  }

  // Voluntary Dissolution of Partnership (Section 21)
  if (formData.dissolutionConsent) {
    let consentText = "*[all Partner's]*"; // Default
    if (formData.dissolutionConsent === "A majority of Partners") {
      consentText = "*[a majority of Partner's]*";
    } else if (formData.dissolutionConsent === "Other (specify)") {
      consentText = `*[${formData.dissolutionConsentOther || "INSERT OTHER"}]*`;
    }
    // Assuming the rest of the sentence in 21.content remains and only the consent part changes.
    // This might need adjustment if the entire sentence structure is meant to be dynamic.
    // For now, replacing the placeholder within the existing sentence structure.
    const originalContent = flatDoc[`${docTitle}.Voluntary Dissolution of Partnership.21.content`] || getDocumentTemplate()["Partnership Agreement"]["Voluntary Dissolution of Partnership"]["21"].content;
    updatedFlatDoc[`${docTitle}.Voluntary Dissolution of Partnership.21.content`] = originalContent.replace(/\*\[all Partner's\]\* OR \*.+\* OR \*.+\*/, consentText);
  }
  
  // New Partners (Section 31)
  if (formData.newPartnerAdmissionPolicy) {
    let admissionText = "*[the Partnership will not admit new partners]*"; // Default
    if (formData.newPartnerAdmissionPolicy === "Unanimous consent") {
      admissionText = "The Partnership upon the *[unanimous consent of al Partners]* may admit new Partners to the Partnership on the new terms and conditions as determined by the Partners at such time";
    } else if (formData.newPartnerAdmissionPolicy === "Majority consent") {
      admissionText = "The Partnership upon the *[majority consent of al Partners]* may admit new Partners to the Partnership on the new terms and conditions as determined by the Partners at such time";
    } else if (formData.newPartnerAdmissionPolicy === "Other terms (specify)") {
      admissionText = `The Partnership upon the *[${formData.newPartnerAdmissionTerms || "INSERT OTHER"}]* may admit new Partners to the Partnership on the new terms and conditions as determined by the Partners at such time`;
    }
    updatedFlatDoc[`${docTitle}.New Partners.31.content`] = admissionText;
  }

  // Arbitration (Section 32)
  if (formData.arbitrationDetails || formData.arbitrationRules) {
      const arbDetails = formData.arbitrationDetails || "*[INSERT]*";
      const arbRules = formData.arbitrationRules || "*[INSERT]*";
      updatedFlatDoc[`${docTitle}.Arbitration.32.content`] = `Any dispute arising out of or in connection with this Agreement that the Partners find themselves unable to resolve, shall be settled by arbitration ${arbDetails} in accordance with the rules of the ${arbRules}.`;
  }

  // Governing Law
  if (formData.governingLaw) {
    updatedFlatDoc[`${docTitle}.Governing Law.35.content`] = `This Agreement shall be governed under the ${formData.governingLaw || "[GOVERNING LAW]"}.`;
  }

  // Partner's withdrawal (Sections 22, 23)
  if (formData.withdrawalNoticeDays || formData.withdrawalNoticeType) {
    const days = formData.withdrawalNoticeDays || "*[DAYS]*";
    const noticeType = formData.withdrawalNoticeType || "*[WRITTEN NOTICE]*";
    updatedFlatDoc[`${docTitle}.Partner's withdrawal.22.content`] = `A Partner may withdraw from the Partnership by providing ${days} ${noticeType} to the other Partners.`;
  }
  if (formData.withdrawalReason) {
    updatedFlatDoc[`${docTitle}.Partner's withdrawal.23.content`] = `A Partner may withdraw from the Partnership for ${formData.withdrawalReason || "*[REASON]*"}.`;
  }

  // Partner's Retirement (Section 26)
  if (formData.retirementConditionPolicy) {
    let retirementText = "*[OTHER CONDITIONS AS AGREED]*"; // Default fallback
    switch (formData.retirementConditionPolicy) {
      case "Upon reaching a specific age":
        retirementText = `upon reaching the age of ${formData.retirementSpecificAge || "*[AGE]*"}`;
        break;
      case "After a specific period of service":
        retirementText = `after ${formData.retirementServiceYears || "*[YEARS]*"} years of service`;
        break;
      case "As per mutual agreement":
        retirementText = "as per mutual agreement between the Partners";
        break;
      case "Other conditions (specify)":
        retirementText = formData.retirementConditionOther || "*[SPECIFY OTHER CONDITIONS]*";
        break;
    }
    updatedFlatDoc[`${docTitle}.Partner's Retirement.26.content`] = `A Partner may retire from the Partnership ${retirementText}.`;
  }

  // Buyout Price Assessment (Section 29)
  if (formData.buyoutValuationMethod) {
    let valuationText = "*[AGREED VALUATION METHOD, E.G., INDEPENDENT APPRAISAL, BOOK VALUE, AGREED FORMULA]*"; // Default
    switch (formData.buyoutValuationMethod) {
      case "Independent appraisal":
        valuationText = "by independent appraisal";
        break;
      case "Book value":
        valuationText = "at its book value as determined by the Partnership's accountant";
        break;
      case "Agreed formula (specify)":
        valuationText = `according to the following agreed formula: ${formData.buyoutValuationFormula || "*[SPECIFY FORMULA]*"}`;
        break;
      case "Other method (specify)":
        valuationText = `by the following method: ${formData.buyoutValuationOther || "*[SPECIFY OTHER METHOD]*"}`;
        break;
    }
    updatedFlatDoc[`${docTitle}.Buyout Price Assessment.29.content`] = `The buyout price will be determined ${valuationText}.`;
  }

  console.log("Applied formData to partnership flatDoc:", updatedFlatDoc);
  return updatedFlatDoc;
}

function updateDocumentWithFormData(currentFormData) {
  const templateDoc = getDocumentTemplate();
  const flatTemplate = flattenObject(templateDoc);
  const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, currentFormData);
  const updatedDoc = unflattenObject(updatedFlatDoc);
  window.currentDocument = updatedDoc;
  console.log("Updated window.currentDocument (Partnership):", window.currentDocument);
}

let lastHighlightedElement = null;

function highlightDocumentSection(questionId) {
  console.log("Attempting to highlight for questionId (Partnership):", questionId);
  const preview = document.getElementById("documentPreview");
  if (!preview) return;

  if (lastHighlightedElement) {
    lastHighlightedElement.classList.remove("highlighted-section");
  }
  preview.querySelectorAll('.highlighted-section').forEach(el => el.classList.remove('highlighted-section'));

  let paths = documentPathMap[questionId];

  if (!paths && questionId.startsWith("partnerName_")) {
      const index = parseInt(questionId.split('_')[1], 10) -1;
      paths = [`Partnership Agreement.Background.partners.${index}`];
  } else if (!paths && questionId.startsWith("partnerAddress_")) {
      const index = parseInt(questionId.split('_')[1], 10) -1;
      paths = [`Partnership Agreement.Background.partners.${index}`];
  } else if (!paths && questionId.startsWith("partnerCashContribution_")) {
      const index = parseInt(questionId.split('_')[1], 10) -1;
      const itemKey = String.fromCharCode(97 + index);
      paths = [`Partnership Agreement.Partners' Capital Contributions.5.${itemKey}`];
  } else if (!paths && questionId.startsWith("partnerNonCashDescription_") || questionId.startsWith("partnerNonCashValue_")) {
      const index = parseInt(questionId.split('_')[1], 10) -1;
      const itemKey = String.fromCharCode(97 + index);
      paths = [`Partnership Agreement.Partners' Capital Contributions.6.${itemKey}`];
  }


  if (paths && paths.length > 0) {
    paths.forEach(path => {
      let targetElement = preview.querySelector(`[data-value-path="${path}"]`);
      if (!targetElement) targetElement = preview.querySelector(`[data-path="${path}"]`);
      if (!targetElement) targetElement = preview.querySelector(`[data-path^="${path}"]`);

      if (targetElement) {
        targetElement.classList.add("highlighted-section");
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        lastHighlightedElement = targetElement;
      } else {
        console.log("No element found for path (Partnership):", path);
      }
    });
  } else {
    console.log("No document paths found for questionId (Partnership):", questionId);
  }
}

function registerHighlightEvents() {
  const inputs = document.querySelectorAll(
    "#keyContainer input, #keyContainer select, #keyContainer textarea"
  );
  inputs.forEach((input) => {
    input.addEventListener("focus", function () {
      highlightDocumentSection(this.id);
    });
  });
}

function renderDynamicPartnerQuestions(count) {
  const container = document.getElementById("dynamicPartnerContainer");
  if (!container) return;
  container.innerHTML = ""; 

  let dynamicHTML = "";
  for (let i = 1; i <= count; i++) {
    dynamicHTML += `<h5>Partner ${i} Details</h5>`;
    dynamicHTML += createQuestionField(`partnerName_${i}`, { question: `Partner ${i} Full Name:`, type: "text" });
    dynamicHTML += createQuestionField(`partnerAddress_${i}`, { question: `Partner ${i} Address:`, type: "textarea" });
    dynamicHTML += `<h5>Partner ${i} Contributions</h5>`;
    dynamicHTML += createQuestionField(`partnerCashContribution_${i}`, { question: `Partner ${i} Cash Contribution ($):`, type: "text" });
    dynamicHTML += createQuestionField(`partnerNonCashDescription_${i}`, { question: `Partner ${i} Non-Cash Contribution Description:`, type: "text" });
    dynamicHTML += createQuestionField(`partnerNonCashValue_${i}`, { question: `Partner ${i} Non-Cash Contribution Value ($):`, type: "text" });
  }
  container.innerHTML = dynamicHTML;

  document.querySelectorAll("#dynamicPartnerContainer input, #dynamicPartnerContainer textarea")
    .forEach(input => {
      if (formDataStore[input.id]) {
          input.value = formDataStore[input.id];
      }
      input.addEventListener("input", function() {
        formDataStore[this.id] = this.value;
        updateDocumentWithFormData(formDataStore);
        updatePreview();
        highlightDocumentSection(this.id);
      });
      input.addEventListener("focus", function () {
        highlightDocumentSection(this.id);
      });
    });
}


function showQuestionnaire() {
  const container = document.getElementById("keyContainer");
  if (!container) return;
  container.innerHTML = "";

  let allQuestionsHTML = "";
  Object.keys(documentQuestions).forEach(stepKey => {
    const stepData = documentQuestions[stepKey];
    allQuestionsHTML += `
      <div class="questionnaire-section">
        <h3>${stepData.title}</h3>
        <div class="step-content">
          ${createQuestionsHTML(stepData, stepKey)}
        </div>
      </div>
    `;
  });
  container.innerHTML = allQuestionsHTML;

  const numberOfPartnersInput = document.getElementById('numberOfPartners');
  let initialPartnerCount = documentQuestions.step1.numberOfPartners.default || 1;
  if (formDataStore.numberOfPartners) {
    initialPartnerCount = parseInt(formDataStore.numberOfPartners, 10);
  }
  if (numberOfPartnersInput) {
    numberOfPartnersInput.value = initialPartnerCount;
  }
  renderDynamicPartnerQuestions(initialPartnerCount);

  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea")
    .forEach(input => {
      if (input.id.startsWith("partner")) return; // Dynamic fields handled by renderDynamicPartnerQuestions

      if (formDataStore[input.id] && input.id !== 'numberOfPartners') {
          input.value = formDataStore[input.id];
      }
      input.addEventListener("input", function() {
        formDataStore[this.id] = this.value;
        if (this.id === 'numberOfPartners') {
            let count = parseInt(this.value, 10) || 0;
            const minCount = documentQuestions.step1.numberOfPartners.min || 1;
            const maxCount = documentQuestions.step1.numberOfPartners.max || 10;
            if (count > maxCount) count = maxCount;
            if (count < minCount) count = minCount;
            this.value = count;
            formDataStore[this.id] = count.toString();
            renderDynamicPartnerQuestions(count);
        }
        updateDocumentWithFormData(formDataStore);
        updatePreview();
        highlightDocumentSection(this.id);
      });
    });
  
  Object.keys(formDataStore).forEach(key => {
    const inputElement = document.getElementById(key);
    if (inputElement && !key.startsWith("partner") && key !== 'numberOfPartners') {
      inputElement.value = formDataStore[key];
    }
  });

  registerHighlightEvents();
}

function createQuestionsHTML(stepData, stepKey) {
  let html = "";
  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;
    if (key === "numberOfPartners" && stepKey === "step1") { // Handle numberOfPartners specifically
        html += createQuestionField(key, data);
        html += `<div id="dynamicPartnerContainer"></div>`; // Container for dynamic partner Qs
    } else if (typeof data === "object" && data.question) {
      html += createQuestionField(key, data);
    }
  }
  return html;
}

function createQuestionField(key, data) {
  if (!data.question) return "";
  
  let conditionAttributes = "";
  if (data.condition) {
    conditionAttributes = ` data-condition-field="${data.condition.field}" data-condition-value="${data.condition.value}" class="conditional-field" style="display:none;"`;
  }

  return `
    <div class="question-field"${conditionAttributes}>
      <label for="${key}">${data.question}</label>
      ${createInputElement(key, data)}
    </div>
  `;
}

function createInputElement(key, data) {
  const placeholder = data.placeholder ? `placeholder="${data.placeholder}"` : "";
  const stepAttr = data.step ? `step="${data.step}"` : "";
  const minAttr = data.min !== undefined ? `min="${data.min}"` : "";
  const maxAttr = data.max !== undefined ? `max="${data.max}"` : "";
  
  switch (data.type) {
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" ${placeholder}></textarea>`;
    case "date":
      return `<input type="date" id="${key}">`;
    case "select":
      const optionsHtml = data.options.map(opt => `<option value="${opt}">${opt}</option>`).join("");
      return `<select id="${key}"><option value="">Select...</option>${optionsHtml}</select>`;
    case "number":
      return `<input type="number" id="${key}" ${placeholder} ${stepAttr} ${minAttr} ${maxAttr}>`;
    default: // text
      return `<input type="text" id="${key}" ${placeholder}>`;
  }
}

function handleConditionalFields() {
  document.querySelectorAll("[data-condition-field]").forEach(conditionalInput => {
    const drivingFieldId = conditionalInput.dataset.conditionField;
    const drivingValue = conditionalInput.dataset.conditionValue;
    const drivingElement = document.getElementById(drivingFieldId);

    const toggleVisibility = () => {
      if (drivingElement && drivingElement.value === drivingValue) {
        conditionalInput.style.display = "";
      } else {
        conditionalInput.style.display = "none";
        // Optionally clear the value of the hidden field
        // const inputInside = conditionalInput.querySelector('input, select, textarea');
        // if (inputInside) inputInside.value = ''; 
      }
    };

    if (drivingElement) {
      drivingElement.addEventListener("change", toggleVisibility);
      drivingElement.addEventListener("input", toggleVisibility); // For text inputs if needed
    }
    toggleVisibility(); // Initial check
  });
}

function convertToHtml(doc) {
  let htmlParts = [];
  const docTitle = Object.keys(doc)[0]; // Should be "Partnership Agreement"
  if (!docTitle || !doc[docTitle]) return "<p>Partnership document data is missing or malformed.</p>";

  const mainContent = doc[docTitle];

  sectionOrder.forEach(sectionKey => {
    if (mainContent[sectionKey]) {
      const sectionPath = `${docTitle}.${sectionKey}`;
      htmlParts.push(`<div class="document-section" data-path="${sectionPath}">`);
      htmlParts.push(`<h5><strong>${sectionKey.toUpperCase()}</strong></h5>`);
      processSectionContent(mainContent[sectionKey], sectionPath, htmlParts, 0);
      htmlParts.push(`</div>`);
    }
  });

  return htmlParts.join("");
}

function processSectionContent(sectionData, currentBasePath, htmlParts, level) {
  const indent = level * 15;
  if (typeof sectionData === 'string') {
    htmlParts.push(`<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${currentBasePath}">${sectionData}</div>`);
  } else if (Array.isArray(sectionData)) {
    // Special handling for Background.partners
    if (currentBasePath.endsWith('.Background.partners')) {
        sectionData.forEach((partnerLine, index) => {
            const itemPath = `${currentBasePath}.${index}`;
            htmlParts.push(`<div class="document-line" style="margin-left: ${indent + 15}px;" data-value-path="${itemPath}">${partnerLine}</div>`);
        });
    } else if (currentBasePath.endsWith('.SIGNATURES.signature_blocks')) {
        sectionData.forEach((block, index) => {
            const itemPath = `${currentBasePath}.${index}`;
            htmlParts.push(`<div class="document-line signature-block" style="margin-left: ${indent + 15}px; margin-top: 10px;">`);
            if(block.partner_signature) htmlParts.push(`<div data-value-path="${itemPath}.partner_signature">${block.partner_signature}: ____________________</div>`);
            if(block.partner_name) htmlParts.push(`<div data-value-path="${itemPath}.partner_name" style="margin-left: 20px;">${block.partner_name}</div>`);
            if(block.representative_signature) htmlParts.push(`<div data-value-path="${itemPath}.representative_signature">${block.representative_signature}: ____________________</div>`);
            if(block.representative_name) htmlParts.push(`<div data-value-path="${itemPath}.representative_name" style="margin-left: 20px;">${block.representative_name}</div>`);
            htmlParts.push(`</div>`);
        });
    } else { // Default array processing
        sectionData.forEach((item, index) => {
            processSectionContent(item, `${currentBasePath}.${index}`, htmlParts, level + 1);
        });
    }
  } else if (typeof sectionData === 'object' && sectionData !== null) {
    // Handle sections that might have a 'content' string and then sub-items (often numbered or lettered)
    if (sectionData.content && typeof sectionData.content === 'string') {
        htmlParts.push(`<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${currentBasePath}.content">${sectionData.content}</div>`);
    }

    // Process other keys, sorting them for consistent order (numbers, then letters, then others)
    Object.keys(sectionData).sort((a, b) => {
        // Prioritize 'content' if it wasn't handled above (e.g. section is just a content string)
        if (a === 'content') return -1;
        if (b === 'content') return 1;
        // Sort numbers numerically, then letters, then other keys
        const isNumA = /^\d+$/.test(a);
        const isNumB = /^\d+$/.test(b);
        if (isNumA && isNumB) return parseInt(a, 10) - parseInt(b, 10);
        if (isNumA) return -1;
        if (isNumB) return 1;
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }).forEach(key => {
      if (key === 'content' && typeof sectionData.content === 'string') return; // Already handled

      const valuePath = `${currentBasePath}.${key}`;
      const subItem = sectionData[key];

      if (typeof subItem === 'string') {
        // Display key if it's not a simple list marker like 'a' or '1' that has its own content structure
        // or if it's an "option"
        const displayKey = (!/^[a-z\d]$/.test(key) || key.startsWith("option")) ? `<strong>${key.startsWith("option") ? key : key + '.'}</strong> ` : "";
        htmlParts.push(`<div class="document-line" style="margin-left: ${indent + 15}px;" data-value-path="${valuePath}">${displayKey}${subItem}</div>`);
      } else if (typeof subItem === 'object' && subItem !== null) {
        // If the key is a number or letter, it's likely a list item.
        // We might not want to print the key itself as a sub-header if its content is directly rendered.
        if (!/^\d+$/.test(key) && !/^[a-z]$/.test(key) && key !== "partners" && key !== "signature_blocks" && !key.startsWith("option")) {
             htmlParts.push(`<div class="document-line sub-item-title" style="margin-left: ${indent + 15}px;" data-path="${valuePath}"><strong>${key}</strong></div>`);
        }
        processSectionContent(subItem, valuePath, htmlParts, level + 1);
      }
    });
  }
}

function updatePreview() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) return;
  if (!window.currentDocument) {
    previewElem.innerHTML = "<p>Error: Partnership document data not loaded.</p>";
    return;
  }
  previewElem.innerHTML = convertToHtml(window.currentDocument);
}

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Partnership Document initialization started");
  if (!window.currentDocument || !window.currentDocument["Partnership Agreement"]) {
     console.warn("window.currentDocument for Partnership Agreement not found. Attempting to load from template.");
     try {
        const response = await fetch('../templates/partnership.json'); // Ensure this path is correct
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        window.currentDocument = await response.json();
        console.log("Loaded partnership.json into window.currentDocument");
     } catch (e) {
        console.error("Failed to load partnership.json:", e);
        window.currentDocument = { "Partnership Agreement": {} }; // Fallback
     }
  }

  initializeDocumentTemplate();
  showQuestionnaire(); // This will also call renderDynamicPartnerQuestions
  updateDocumentWithFormData(formDataStore); // Initial population
  updatePreview();
  console.log("Partnership Document initialization completed.");
});