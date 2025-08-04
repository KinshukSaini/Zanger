// Employee Contract document order configuration - Updated to match JSON structure
const sectionOrder = [
  "TITLE",
  "DATE", 
  "BETWEEN",
  "IT IS AGREED",
  "SIGNATURES"
];

const agreementSectionOrder = [
  "1. General",
  "2. Duties and Job Title",
  "3. Date of Commencement/ Date of Continuous employment [and Notice Period]",
  "4. Hours of work",
  "5. Place of work",
  "6. Remuneration",
  "7. Collective agreements",
  "8. Holidays",
  "9. Sickness Absence",
  "10. Maternity and Paternity Rights",
  "11. Pension",
  "12. Non -- Compulsory Retirement",
  "13. Restrictions and Confidentiality",
  "14. Mobility",
  "15. Grievance Procedure",
  "16. Disciplinary Procedure",
  "17. Employee Handbook and Employment Policies",
  "18. Termination of employment",
  "19. Data Protection",
  "20. Confidential Information",
  "21. Copyright, Inventions and Patents",
  "22. Changes to Terms and Conditions of Employment",
  "23. Severability",
  "24. Jurisdiction"
];

// Global variables - Initialize first
let documentTemplate = null;
let formDataStore = {};
let selectedText = "";
let selectionRange = null;
let autoSaveTimeout;

// Constants
const INTERNAL_FIELDS_TO_HIDE = [];

// Complete Document Questions - 10 comprehensive steps
const documentQuestions = {
  step1: {
    title: "Basic Contract Information",
    contractDate: {
      question: "Enter the contract date",
      type: "date"
    },
    employerName: {
      question: "Enter employer's name/organization",
      type: "text",
      placeholder: "e.g., ABC Company Limited"
    },
    employerJurisdiction: {
      question: "Select jurisdiction of registration",
      type: "select",
      options: ["England and Wales", "Scotland", "Northern Ireland"]
    },
    employerRegNumber: {
      question: "Enter employer's registration number",
      type: "text",
      placeholder: "e.g., 12345678"
    },
    employerAddress: {
      question: "Enter employer's registered office address", 
      type: "textarea",
      placeholder: "Full registered address including postcode"
    }
  },
  step2: {
    title: "Employee Information & Employment Type",
    employeeName: {
      question: "Enter employee's full name",
      type: "text",
      placeholder: "e.g., John Smith"
    },
    employeeAddress: {
      question: "Enter employee's address",
      type: "textarea", 
      placeholder: "Full address including postcode"
    },
    employmentType: {
      question: "Select employment type",
      type: "select",
      options: ["Temporary", "Fixed-term", "Open-ended (permanent)"]
    },
    employmentStartDate: {
      question: "Enter employment start date",
      type: "date"
    },
    hasPreviousEmployment: {
      question: "Does previous employment count towards continuous service?",
      type: "select",
      options: ["No", "Yes"]
    },
    previousEmployerName: {
      question: "Enter previous employer's name",
      type: "text",
      placeholder: "Name of previous employer",
      showIf: "hasPreviousEmployment=Yes"
    },
    previousEmploymentStartDate: {
      question: "Enter previous employment start date",
      type: "date",
      showIf: "hasPreviousEmployment=Yes"
    }
  },
  step3: {
    title: "Employment Terms (Temporary/Fixed-term)",
    temporaryEndDate: {
      question: "Enter expected end date for temporary employment",
      type: "date",
      showIf: "employmentType=Temporary"
    },
    temporaryNoticeRequirement: {
      question: "Enter notice requirement for temporary employment",
      type: "text",
      placeholder: "e.g., 1 week, 2 weeks, 1 month",
      showIf: "employmentType=Temporary"
    },
    fixedTermEndDate: {
      question: "Enter end date for fixed-term employment",
      type: "date",
      showIf: "employmentType=Fixed-term"
    },
    fixedTermNoticeRequirement: {
      question: "Enter notice requirement for fixed-term employment",
      type: "text",
      placeholder: "e.g., 1 week, 2 weeks, 1 month",
      showIf: "employmentType=Fixed-term"
    },
    probationaryPeriod: {
      question: "Enter probationary period (months)",
      type: "select",
      options: ["3", "6", "9", "12"],
      showIf: "employmentType=Open-ended (permanent)"
    }
  },
  step4: {
    title: "Job Details & Working Arrangements",
    jobTitle: {
      question: "Enter job title",
      type: "text",
      placeholder: "e.g., Software Developer, Marketing Manager"
    },
    dutiesType: {
      question: "How will duties be specified?",
      type: "select",
      options: ["General duties as determined by employer", "Specific duties and responsibilities"]
    },
    specificDuties: {
      question: "Enter specific duties and responsibilities",
      type: "textarea",
      placeholder: "Detailed job description and key responsibilities",
      showIf: "dutiesType=Specific duties and responsibilities"
    },
    workStartTime: {
      question: "Enter work start time",
      type: "text",
      placeholder: "e.g., 9:00"
    },
    workEndTime: {
      question: "Enter work end time",
      type: "text",
      placeholder: "e.g., 17:00"
    },
    lunchTimeStart: {
      question: "Enter lunch break start time (optional)",
      type: "text",
      placeholder: "e.g., 12:00"
    },
    lunchTimeEnd: {
      question: "Enter lunch break end time (optional)",
      type: "text",
      placeholder: "e.g., 13:00"
    },
    workLocation: {
      question: "Enter primary work location",
      type: "textarea",
      placeholder: "Address or description of main workplace"
    }
  },
  step5: {
    title: "Remuneration & Benefits",
    annualSalary: {
      question: "Enter annual salary (£)",
      type: "text",
      placeholder: "e.g., 35000"
    },
    paymentFrequency: {
      question: "Select payment frequency",
      type: "select",
      options: ["Monthly", "Weekly", "Fortnightly"]
    },
    paymentDay: {
      question: "Enter payment day",
      type: "text",
      placeholder: "e.g., last Friday of each month, every Friday"
    },
    paymentMethod: {
      question: "Enter payment method",
      type: "text",
      placeholder: "e.g., direct credit transfer to nominated bank account"
    },
    overtimeEntitled: {
      question: "Is employee entitled to overtime pay?",
      type: "select",
      options: ["No", "Yes"]
    },
    overtimeBasis: {
      question: "Enter overtime payment basis",
      type: "textarea",
      placeholder: "e.g., time and a half for hours over 40 per week",
      showIf: "overtimeEntitled=Yes"
    },
    additionalTerms: {
      question: "Enter any additional remuneration terms (optional)",
      type: "textarea",
      placeholder: "Bonuses, benefits, allowances, etc."
    }
  },
  step6: {
    title: "Collective Agreements & Holidays",
    hasCollectiveAgreement: {
      question: "Are there collective agreements affecting employment?",
      type: "select",
      options: ["No", "Yes"]
    },
    collectiveAgreementDetails: {
      question: "Specify the collective agreement",
      type: "text",
      placeholder: "Name and details of collective agreement",
      showIf: "hasCollectiveAgreement=Yes"
    },
    holidayEntitlement: {
      question: "Enter annual holiday entitlement (days)",
      type: "text",
      placeholder: "e.g., 28 (including bank holidays)"
    },
    holidayYearStart: {
      question: "Enter holiday year start date",
      type: "text",
      placeholder: "e.g., 1st January, 1st April"
    },
    holidayYearEnd: {
      question: "Enter holiday year end date",
      type: "text",
      placeholder: "e.g., 31st December, 31st March"
    },
    holidayCalculationBasis: {
      question: "Enter holiday pay calculation basis",
      type: "text",
      placeholder: "e.g., 1/260th of annual salary per day"
    },
    holidayApprovalManager: {
      question: "Enter job title of holiday approval manager",
      type: "text",
      placeholder: "e.g., Line Manager, HR Manager"
    },
    maxCarryForwardDays: {
      question: "Maximum holiday days that can be carried forward",
      type: "text",
      placeholder: "e.g., 5 days"
    },
    sickHolidayNotificationManager: {
      question: "Enter job title for sick during holiday notifications",
      type: "text",
      placeholder: "e.g., Line Manager, HR Manager"
    },
    sickHolidayNotificationDays: {
      question: "Days to confirm holiday affected by sickness",
      type: "text",
      placeholder: "e.g., 5 days"
    }
  },
  step7: {
    title: "Sickness & Absence Policies",
    sicknessContactManager: {
      question: "Enter job title to contact for sickness absence",
      type: "text",
      placeholder: "e.g., Line Manager, HR Manager"
    },
    sicknessNotificationTime: {
      question: "Latest time to report sickness on first day",
      type: "text",
      placeholder: "e.g., 9:00 AM, 10:00 AM"
    },
    fitNoteContactManager: {
      question: "Enter job title to send fit notes/medical certificates",
      type: "text",
      placeholder: "e.g., Line Manager, HR Manager"
    },
    sickPayType: {
      question: "Select sick pay arrangement",
      type: "select",
      options: ["Statutory Sick Pay (SSP) only", "Occupational sick pay scheme"]
    },
    sspQualifyingDays: {
      question: "Enter qualifying days for SSP",
      type: "text",
      placeholder: "e.g., Monday to Friday",
      showIf: "sickPayType=Statutory Sick Pay (SSP) only"
    },
    occupationalSickPayDays: {
      question: "Maximum days of occupational sick pay per year",
      type: "text",
      placeholder: "e.g., 20 days, 6 months",
      showIf: "sickPayType=Occupational sick pay scheme"
    }
  },
  step8: {
    title: "Pension & Benefits",
    maternityPaternityManager: {
      question: "Enter job title for maternity/paternity enquiries",
      type: "text",
      placeholder: "e.g., HR Manager, Line Manager"
    },
    pensionType: {
      question: "Select pension arrangement",
      type: "select",
      options: ["No pension arrangements", "Designated pension scheme", "Auto-enrolment pension"]
    },
    pensionSchemeName: {
      question: "Enter pension scheme name",
      type: "text",
      placeholder: "Name of pension scheme",
      showIf: "pensionType=Designated pension scheme"
    },
    pensionDetailsLocation: {
      question: "Where can pension details be found?",
      type: "text",
      placeholder: "e.g., Employee Handbook, HR Department",
      showIf: "pensionType=Designated pension scheme"
    },
    pensionDetailsContact: {
      question: "Enter job title for pension enquiries",
      type: "text",
      placeholder: "e.g., HR Manager, Payroll Manager",
      showIf: "pensionType=Designated pension scheme"
    },
    employerPensionContribution: {
      question: "Enter employer pension contribution (%)",
      type: "text",
      placeholder: "e.g., 3%, 5%",
      showIf: "pensionType=Designated pension scheme"
    },
    employeePensionContribution: {
      question: "Enter maximum employee pension contribution (%)",
      type: "text",
      placeholder: "e.g., 5%, 8%",
      showIf: "pensionType=Designated pension scheme"
    },
    contractingOutCertificate: {
      question: "Is a contracting out certificate in force?",
      type: "select",
      options: ["No", "Yes"]
    }
  },
  step9: {
    title: "Procedures & Policies",
    grievanceProcedureContact: {
      question: "Enter job title for grievance procedure requests",
      type: "text",
      placeholder: "e.g., HR Manager, Line Manager"
    },
    hasEmployeeHandbook: {
      question: "Are changes subject to Employee Handbook/Manual?",
      type: "select",
      options: ["No", "Yes"]
    }
  },
  step10: {
    title: "Termination & Legal",
    terminationType: {
      question: "Select termination notice approach",
      type: "select",
      options: ["Custom notice periods", "Statutory notice periods"]
    },
    probationaryNoticeMonths: {
      question: "Enter probationary period length for custom notice (months)",
      type: "text",
      placeholder: "e.g., 6 months",
      showIf: "terminationType=Custom notice periods"
    },
    governingLaw: {
      question: "Enter governing law",
      type: "text",
      placeholder: "e.g., English, Scottish, Welsh"
    },
    courtJurisdiction: {
      question: "Enter court jurisdiction",
      type: "text",
      placeholder: "e.g., English, Scottish, Welsh"
    },
    employerSigningName: {
      question: "Enter name of person signing for employer",
      type: "text",
      placeholder: "Name and title of employer representative"
    }
  }
};

// Complete Document Path Mapping to match JSON structure
const documentPathMap = {
  // Contract date
  "contractDate": ["Employee Contract.DATE.content"],
  
  // Employer information
  "employerName": ["Employee Contract.BETWEEN.a", "Employee Contract.SIGNATURES.employer.preamble"],
  "employerJurisdiction": ["Employee Contract.BETWEEN.a"],
  "employerRegNumber": ["Employee Contract.BETWEEN.a"], 
  "employerAddress": ["Employee Contract.BETWEEN.a"],
  
  // Employee information
  "employeeName": ["Employee Contract.BETWEEN.b", "Employee Contract.SIGNATURES.employee.name_line"],
  "employeeAddress": ["Employee Contract.BETWEEN.b"],
  
  // Employment type and dates
  "employmentType": [
    "Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.temporary_employment.content",
    "Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.fixed_term.content",
    "Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.open_ended.content"
  ],
  "employmentStartDate": ["Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.1.content"],
  "hasPreviousEmployment": ["Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.2.option_1"],
  "previousEmployerName": ["Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.2.option_2"],
  "previousEmploymentStartDate": ["Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.2.option_2"],
  "temporaryEndDate": ["Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.temporary_employment.content"],
  "temporaryNoticeRequirement": ["Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.temporary_employment.content"],
  "fixedTermEndDate": ["Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.fixed_term.content"],
  "fixedTermNoticeRequirement": ["Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.fixed_term.content"],
  "probationaryPeriod": [
    "Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.open_ended.content",
    "Employee Contract.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.open_ended.notice_period"
  ],
  
  // Job details
  "jobTitle": ["Employee Contract.IT IS AGREED.2. Duties and Job Title.2.1.content"],
  "dutiesType": [
    "Employee Contract.IT IS AGREED.2. Duties and Job Title.2.1.option_1",
    "Employee Contract.IT IS AGREED.2. Duties and Job Title.2.1.option_2"
  ],
  "specificDuties": ["Employee Contract.IT IS AGREED.2. Duties and Job Title.2.1.option_2"],
  
  // Working hours and location
  "workStartTime": ["Employee Contract.IT IS AGREED.4. Hours of work.4.1.content"],
  "workEndTime": ["Employee Contract.IT IS AGREED.4. Hours of work.4.1.content"],
  "lunchTimeStart": ["Employee Contract.IT IS AGREED.4. Hours of work.4.1.content"],
  "lunchTimeEnd": ["Employee Contract.IT IS AGREED.4. Hours of work.4.1.content"],
  "workLocation": ["Employee Contract.IT IS AGREED.5. Place of work.content"],
  
  // Remuneration
  "annualSalary": ["Employee Contract.IT IS AGREED.6. Remuneration.6.1.content"],
  "paymentFrequency": ["Employee Contract.IT IS AGREED.6. Remuneration.6.1.content"],
  "paymentDay": ["Employee Contract.IT IS AGREED.6. Remuneration.6.1.content"],
  "paymentMethod": ["Employee Contract.IT IS AGREED.6. Remuneration.6.1.content"],
  "overtimeEntitled": [
    "Employee Contract.IT IS AGREED.4. Hours of work.4.3.option_1",
    "Employee Contract.IT IS AGREED.4. Hours of work.4.3.option_2"
  ],
  "overtimeBasis": ["Employee Contract.IT IS AGREED.4. Hours of work.4.3.option_1"],
  "additionalTerms": ["Employee Contract.IT IS AGREED.6. Remuneration.6.1.content"],
  
  // Collective agreements
  "hasCollectiveAgreement": [
    "Employee Contract.IT IS AGREED.7. Collective agreements.option_1",
    "Employee Contract.IT IS AGREED.7. Collective agreements.option_2"
  ],
  "collectiveAgreementDetails": ["Employee Contract.IT IS AGREED.7. Collective agreements.option_2"],
  
  // Holidays
  "holidayEntitlement": ["Employee Contract.IT IS AGREED.8. Holidays.8.1.content"],
  "holidayYearStart": ["Employee Contract.IT IS AGREED.8. Holidays.8.2.content"],
  "holidayYearEnd": ["Employee Contract.IT IS AGREED.8. Holidays.8.2.content"],
  "holidayCalculationBasis": ["Employee Contract.IT IS AGREED.8. Holidays.8.4.8.4.1.content"],
  "holidayApprovalManager": ["Employee Contract.IT IS AGREED.8. Holidays.8.5.content"],
  "maxCarryForwardDays": ["Employee Contract.IT IS AGREED.8. Holidays.8.6.content"],
  "sickHolidayNotificationManager": ["Employee Contract.IT IS AGREED.8. Holidays.8.7.8.7.1.content"],
  "sickHolidayNotificationDays": ["Employee Contract.IT IS AGREED.8. Holidays.8.7.8.7.3.content"],
  
  // Sickness absence
  "sicknessContactManager": ["Employee Contract.IT IS AGREED.9. Sickness Absence.9.1.content"],
  "sicknessNotificationTime": ["Employee Contract.IT IS AGREED.9. Sickness Absence.9.1.content"],
  "fitNoteContactManager": ["Employee Contract.IT IS AGREED.9. Sickness Absence.9.3.content"],
  "sickPayType": [
    "Employee Contract.IT IS AGREED.9. Sickness Absence.9.4.ssp_only.content",
    "Employee Contract.IT IS AGREED.9. Sickness Absence.9.4.sick_pay_scheme.content"
  ],
  "sspQualifyingDays": ["Employee Contract.IT IS AGREED.9. Sickness Absence.9.4.ssp_only.content"],
  "occupationalSickPayDays": ["Employee Contract.IT IS AGREED.9. Sickness Absence.9.4.sick_pay_scheme.content"],
  
  // Maternity and pension
  "maternityPaternityManager": ["Employee Contract.IT IS AGREED.10. Maternity and Paternity Rights.content"],
  "pensionType": [
    "Employee Contract.IT IS AGREED.11. Pension.11.1.option_1",
    "Employee Contract.IT IS AGREED.11. Pension.11.1.option_2",
    "Employee Contract.IT IS AGREED.11. Pension.11.1.option_3"
  ],
  "pensionSchemeName": ["Employee Contract.IT IS AGREED.11. Pension.11.1.option_2"],
  "pensionDetailsLocation": ["Employee Contract.IT IS AGREED.11. Pension.11.1.option_2"],
  "pensionDetailsContact": ["Employee Contract.IT IS AGREED.11. Pension.11.1.option_2"],
  "employerPensionContribution": ["Employee Contract.IT IS AGREED.11. Pension.11.1.option_2"],
  "employeePensionContribution": ["Employee Contract.IT IS AGREED.11. Pension.11.1.option_2"],
  "contractingOutCertificate": ["Employee Contract.IT IS AGREED.11. Pension.11.2.content"],
  
  // Procedures
  "grievanceProcedureContact": ["Employee Contract.IT IS AGREED.15. Grievance Procedure.content"],
  "hasEmployeeHandbook": ["Employee Contract.IT IS AGREED.22. Changes to Terms and Conditions of Employment.content"],
  
  // Termination and legal
  "terminationType": ["Employee Contract.IT IS AGREED.18. Termination of employment.18.1.option_1"],
  "probationaryNoticeMonths": ["Employee Contract.IT IS AGREED.18. Termination of employment.18.1.option_1"],
  "governingLaw": ["Employee Contract.IT IS AGREED.24. Jurisdiction.content"],
  "courtJurisdiction": ["Employee Contract.IT IS AGREED.24. Jurisdiction.content"],
  "employerSigningName": ["Employee Contract.SIGNATURES.employer.preamble"]
};

// Utility functions
function splitPath(path) {
  return path.split(".").map(part => part.trim());
}

function flattenObject(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
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
    const keys = splitPath(key);
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

function formatDate(dateStr) {
  if (!dateStr) return "*[Date]*";
  const date = new Date(dateStr);
  const day = date.getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// Template management
function initializeDocumentTemplate() {
  if (window.currentDocument) {
    documentTemplate = JSON.parse(JSON.stringify(window.currentDocument));
  }
}

function getDocumentTemplate() {
  if (!documentTemplate) {
    initializeDocumentTemplate();
  }
  return JSON.parse(JSON.stringify(documentTemplate));
}

// Form data validation
function getFieldValue(fieldId, defaultValue = "*[Required]*") {
  const value = formDataStore[fieldId];
  return value && value.trim() !== '' ? value : defaultValue;
}

// Conditional content helpers
function shouldSkipConditionalContent(nestedKey, currentPath, formData) {
  if (currentPath.includes("3.3")) {
    if (nestedKey === "temporary_employment" && formData.employmentType !== "Temporary") return true;
    if (nestedKey === "fixed_term" && formData.employmentType !== "Fixed-term") return true;
    if (nestedKey === "open_ended" && formData.employmentType !== "Open-ended (permanent)") return true;
  }
  if (currentPath.includes("2.1")) {
    if (nestedKey === "option_1" && formData.dutiesType !== "General duties as determined by employer") return true;
    if (nestedKey === "option_2" && formData.dutiesType !== "Specific duties and responsibilities") return true;
  }
  if (currentPath.includes("4.3")) {
    if (nestedKey === "option_1" && formData.overtimeEntitled !== "Yes") return true;
    if (nestedKey === "option_2" && formData.overtimeEntitled !== "No") return true;
  }
  if (currentPath.includes("3.2")) {
    if (nestedKey === "option_1" && formData.hasPreviousEmployment !== "No") return true;
    if (nestedKey === "option_2" && formData.hasPreviousEmployment !== "Yes") return true;
  }
  if (currentPath.includes("7. Collective agreements")) {
    if (nestedKey === "option_1" && formData.hasCollectiveAgreement !== "No") return true;
    if (nestedKey === "option_2" && formData.hasCollectiveAgreement !== "Yes") return true;
  }
  if (currentPath.includes("9.4")) {
    if (nestedKey === "ssp_only" && formData.sickPayType !== "Statutory Sick Pay (SSP) only") return true;
    if (nestedKey === "sick_pay_scheme" && formData.sickPayType !== "Occupational sick pay scheme") return true;
  }
  if (currentPath.includes("11.1")) {
    if (nestedKey === "option_1" && formData.pensionType !== "No pension arrangements") return true;
    if (nestedKey === "option_2" && formData.pensionType !== "Designated pension scheme") return true;
    if (nestedKey === "option_3" && formData.pensionType !== "Auto-enrolment pension") return true;
  }
  if (currentPath.includes("18.1")) {
    if (nestedKey === "option_1" && formData.terminationType !== "Custom notice periods") return true;
    if (nestedKey === "option_2" && formData.terminationType !== "Statutory notice periods") return true;
  }
  return false;
}

function shouldShowORDivider(nestedKey, currentPath, formData) {
  return false; // Always hide OR dividers in conditional rendering
}

function shouldShowHeader(nestedKey, currentPath, formData) {
  if (currentPath.includes("3.3")) {
    if (currentPath.includes("temporary_employment") && formData.employmentType === "Temporary") return true;
    if (currentPath.includes("fixed_term") && formData.employmentType === "Fixed-term") return true;
    if (currentPath.includes("open_ended") && formData.employmentType === "Open-ended (permanent)") return true;
  }
  if (currentPath.includes("9.4")) {
    if (currentPath.includes("ssp_only") && formData.sickPayType === "Statutory Sick Pay (SSP) only") return true;
    if (currentPath.includes("sick_pay_scheme") && formData.sickPayType === "Occupational sick pay scheme") return true;
  }
  return false;
}

// Table rendering
function renderNoticeTable(tableData, tablePath) {
  if (!tableData.headers || !tableData.rows) return "";
  let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">`;
  tableHtml += `<tr>`;
  tableData.headers.forEach(header => {
    tableHtml += `<th style="border: 1px solid #333; padding: 8px; background-color: #f5f5f5; font-weight: bold;">${header}</th>`;
  });
  tableHtml += `</tr>`;
  tableData.rows.forEach((row, index) => {
    tableHtml += `<tr>`;
    row.forEach(cell => {
      tableHtml += `<td style="border: 1px solid #333; padding: 8px;">${cell}</td>`;
    });
    tableHtml += `</tr>`;
  });
  tableHtml += `</table>`;
  return tableHtml;
}

// Option clearing
function clearConflictingOptions(updatedFlatDoc, formData, documentTitle) {
  if (formData.employmentType) {
    const empTypes = ["temporary_employment", "fixed_term", "open_ended"];
    empTypes.forEach(type => {
      if ((type === "temporary_employment" && formData.employmentType !== "Temporary") ||
          (type === "fixed_term" && formData.employmentType !== "Fixed-term") ||
          (type === "open_ended" && formData.employmentType !== "Open-ended (permanent)")) {
        delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.${type}.content`];
        if (type === "open_ended") {
          delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.${type}.notice_period`];
        }
      }
    });
  }
  
  if (formData.dutiesType) {
    if (formData.dutiesType !== "General duties as determined by employer") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.2. Duties and Job Title.2.1.option_1`];
    }
    if (formData.dutiesType !== "Specific duties and responsibilities") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.2. Duties and Job Title.2.1.option_2`];
    }
  }
  
  if (formData.overtimeEntitled) {
    if (formData.overtimeEntitled !== "Yes") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.4. Hours of work.4.3.option_1`];
    }
    if (formData.overtimeEntitled !== "No") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.4. Hours of work.4.3.option_2`];
    }
  }
  
  if (formData.hasPreviousEmployment) {
    if (formData.hasPreviousEmployment !== "No") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.2.option_1`];
    }
    if (formData.hasPreviousEmployment !== "Yes") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.2.option_2`];
    }
  }
  
  if (formData.hasCollectiveAgreement) {
    if (formData.hasCollectiveAgreement !== "No") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.7. Collective agreements.option_1`];
    }
    if (formData.hasCollectiveAgreement !== "Yes") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.7. Collective agreements.option_2`];
    }
  }
  
  if (formData.sickPayType) {
    if (formData.sickPayType !== "Statutory Sick Pay (SSP) only") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.9. Sickness Absence.9.4.ssp_only.content`];
    }
    if (formData.sickPayType !== "Occupational sick pay scheme") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.9. Sickness Absence.9.4.sick_pay_scheme.content`];
    }
  }
  
  if (formData.pensionType) {
    if (formData.pensionType !== "No pension arrangements") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.11. Pension.11.1.option_1`];
    }
    if (formData.pensionType !== "Designated pension scheme") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.11. Pension.11.1.option_2`];
    }
    if (formData.pensionType !== "Auto-enrolment pension") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.11. Pension.11.1.option_3`];
    }
  }
  
  if (formData.terminationType) {
    if (formData.terminationType !== "Custom notice periods") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.18. Termination of employment.18.1.option_1`];
    }
    if (formData.terminationType !== "Statutory notice periods") {
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.18. Termination of employment.18.1.option_2.content`];
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.18. Termination of employment.18.1.option_2.notice_by_employer.header`];
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.18. Termination of employment.18.1.option_2.notice_by_employee.header`];
      delete updatedFlatDoc[`${documentTitle}.IT IS AGREED.18. Termination of employment.18.1.option_2.additional_terms`];
    }
  }
}

// COMPLETE form data application - ALL FIELDS IMPLEMENTED
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Employee Contract";

  clearConflictingOptions(updatedFlatDoc, formData, documentTitle);

  // Contract date
  if (formData.contractDate) {
    const dateKey = `${documentTitle}.DATE.content`;
    updatedFlatDoc[dateKey] = formatDate(formData.contractDate);
  }

  // Employer information
  if (formData.employerName || formData.employerJurisdiction || formData.employerRegNumber || formData.employerAddress) {
    const employerKey = `${documentTitle}.BETWEEN.a`;
    let employerContent = formData.employerName || "*[Name of Employer]*";
    employerContent += " an organisation registered in ";
    employerContent += formData.employerJurisdiction || "*[England and Wales]*";
    employerContent += " under registration number ";
    employerContent += formData.employerRegNumber || "*[registration number]*";
    employerContent += " whose registered office is at ";
    employerContent += formData.employerAddress || "*[Address]*";
    employerContent += ' (hereinafter referred to as "the Employer")';
    updatedFlatDoc[employerKey] = employerContent;
  }

  // Employee information
  if (formData.employeeName || formData.employeeAddress) {
    const employeeKey = `${documentTitle}.BETWEEN.b`;
    let employeeContent = formData.employeeName || "*[Name of Employee]*";
    employeeContent += " of ";
    employeeContent += formData.employeeAddress || "*[Address]*";
    employeeContent += ' (hereinafter referred to as "Employee")';
    updatedFlatDoc[employeeKey] = employeeContent;
  }

  // Employment start date
  if (formData.employmentStartDate) {
    const startDateKey = `${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.1.content`;
    updatedFlatDoc[startDateKey] = `Employee's period of continuous employment with us begins on ${formatDate(formData.employmentStartDate)}.`;
  }

  // Previous employment
  if (formData.hasPreviousEmployment === "No") {
    const prevEmpKey = `${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.2.option_1`;
    updatedFlatDoc[prevEmpKey] = "No employment with a previous employer counts as part of Employee's period of continuous employment.";
  } else if (formData.hasPreviousEmployment === "Yes" && formData.previousEmployerName) {
    const prevEmpKey = `${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.2.option_2`;
    let prevEmpContent = "Employee's employment with ";
    prevEmpContent += formData.previousEmployerName;
    prevEmpContent += " which began on ";
    prevEmpContent += formData.previousEmploymentStartDate ? formatDate(formData.previousEmploymentStartDate) : "*[Date]*";
    prevEmpContent += " will count as part of Employee's continuous period of employment with us.";
    updatedFlatDoc[prevEmpKey] = prevEmpContent;
  }

  // Employment type - Temporary
  if (formData.employmentType === "Temporary") {
    const tempKey = `${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.temporary_employment.content`;
    let tempContent = "Employee's employment is on a temporary basis and is currently expected to continue only until ";
    tempContent += formData.temporaryEndDate ? formatDate(formData.temporaryEndDate) : "*[date]*";
    tempContent += ". Employee's temporary employment is subject to termination by either party giving to the other ";
    tempContent += formData.temporaryNoticeRequirement || "*[number of days/weeks etc.]*";
    tempContent += " notice in writing of termination of employment. Alternatively, Employee's employment may be summarily terminated where Employee is found guilty of gross misconduct.";
    updatedFlatDoc[tempKey] = tempContent;
  }

  // Employment type - Fixed-term
  if (formData.employmentType === "Fixed-term") {
    const fixedKey = `${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.fixed_term.content`;
    let fixedContent = "Employee's employment is for a fixed term and will terminate on ";
    fixedContent += formData.fixedTermEndDate ? formatDate(formData.fixedTermEndDate) : "*[date]*";
    fixedContent += ". It may be terminated at any time before its expiry by either party giving to the other ";
    fixedContent += formData.fixedTermNoticeRequirement || "*[number of days/weeks etc.]*";
    fixedContent += " notice in writing of the termination of Employee's employment. Alternatively, Employee's employment may be summarily terminated where Employee is found guilty of gross misconduct.";
    updatedFlatDoc[fixedKey] = fixedContent;
  }

  // Employment type - Open-ended
  if (formData.employmentType === "Open-ended (permanent)") {
    const openEndedKey = `${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.open_ended.content`;
    let openEndedContent = "The first ";
    openEndedContent += formData.probationaryPeriod || "*[number of months]*";
    openEndedContent += " of Employee's employment will be a probationary period. During this period Employee's performance and conduct will be monitored. At the end of the probationary period Employee's performance will be reviewed and if found satisfactory Employee's appointment will be confirmed. The probationary period may be extended at the Employer's discretion.";
    updatedFlatDoc[openEndedKey] = openEndedContent;

    const noticeKey = `${documentTitle}.IT IS AGREED.3. Date of Commencement/ Date of Continuous employment [and Notice Period].3.3.open_ended.notice_period`;
    let noticeContent = "During the ";
    noticeContent += formData.probationaryPeriod || "*[number]*";
    noticeContent += " months probationary period the notice required by either party to this Contract to terminate Employee's employment will be one week.";
    updatedFlatDoc[noticeKey] = noticeContent;
  }

  // Job title
  if (formData.jobTitle) {
    const jobTitleKey = `${documentTitle}.IT IS AGREED.2. Duties and Job Title.2.1.content`;
    let jobContent = "Employee is employed by the Employer in the capacity of ";
    jobContent += formData.jobTitle;
    jobContent += ". Employee will be required to undertake";
    updatedFlatDoc[jobTitleKey] = jobContent;
  }

  // Job duties
  if (formData.dutiesType === "General duties as determined by employer") {
    const dutiesKey = `${documentTitle}.IT IS AGREED.2. Duties and Job Title.2.1.option_1`;
    updatedFlatDoc[dutiesKey] = "such duties and responsibilities as may be determined by the Employer from time to time";
  } else if (formData.dutiesType === "Specific duties and responsibilities" && formData.specificDuties) {
    const dutiesKey = `${documentTitle}.IT IS AGREED.2. Duties and Job Title.2.1.option_2`;
    updatedFlatDoc[dutiesKey] = `the following duties and responsibilities: ${formData.specificDuties}`;
  }

  // Working hours
  if (formData.workStartTime || formData.workEndTime || formData.lunchTimeStart || formData.lunchTimeEnd) {
    const hoursKey = `${documentTitle}.IT IS AGREED.4. Hours of work.4.1.content`;
    let hoursContent = "Employee's normal working hours are between ";
    hoursContent += formData.workStartTime || "*[time]*";
    hoursContent += " am and ";
    hoursContent += formData.workEndTime || "*[time]*";
    hoursContent += " pm Mondays to Fridays inclusive with one hour for lunch";
    if (formData.lunchTimeStart && formData.lunchTimeEnd) {
      hoursContent += ` which must be taken between ${formData.lunchTimeStart} and ${formData.lunchTimeEnd} pm`;
    }
    hoursContent += ".";
    updatedFlatDoc[hoursKey] = hoursContent;
  }

  // Overtime
  if (formData.overtimeEntitled === "Yes" && formData.overtimeBasis) {
    const overtimeKey = `${documentTitle}.IT IS AGREED.4. Hours of work.4.3.option_1`;
    updatedFlatDoc[overtimeKey] = `Employee will be paid for any overtime worked in addition to Employee's normal working hours on the following basis: ${formData.overtimeBasis}`;
  } else if (formData.overtimeEntitled === "No") {
    const overtimeKey = `${documentTitle}.IT IS AGREED.4. Hours of work.4.3.option_2`;
    updatedFlatDoc[overtimeKey] = "Employee may be asked to work additional hours beyond Employee's normal hours and it is a condition of Employee's employment that Employee agree to do so when reasonably asked. Employee will not be entitled to overtime payments for hours worked outside Employee's normal working hours.";
  }

  // Work location
  if (formData.workLocation) {
    const locationKey = `${documentTitle}.IT IS AGREED.5. Place of work.content`;
    updatedFlatDoc[locationKey] = `Employee's normal place of work will be at ${formData.workLocation} or such other places as the Employer may reasonably require.`;
  }

  // Salary
  if (formData.annualSalary || formData.paymentFrequency || formData.paymentDay || formData.paymentMethod) {
    const salaryKey = `${documentTitle}.IT IS AGREED.6. Remuneration.6.1.content`;
    let salaryContent = "Employee's salary is £";
    salaryContent += formData.annualSalary || "*[amount]*";
    salaryContent += " per year, to be paid ";
    salaryContent += formData.paymentFrequency || "*[insert frequency e.g. monthly]*";
    salaryContent += " normally on ";
    salaryContent += formData.paymentDay || "*[e.g. the last Friday of each month]*";
    salaryContent += ". Payment will be made ";
    salaryContent += formData.paymentFrequency || "*[specify frequency]*";
    salaryContent += " by ";
    salaryContent += formData.paymentMethod || "*[e.g. direct credit transfer to a bank or building society account nominated by Employee]*";
    salaryContent += ". Employee will [not] be entitled to overtime payment for hours worked outside Employee's normal weekly hours (as specified above). ";
    salaryContent += formData.additionalTerms || "*[additional terms]*";
    salaryContent += ".";
    updatedFlatDoc[salaryKey] = salaryContent;
  }

  // Collective agreements
  if (formData.hasCollectiveAgreement === "No") {
    const collectiveKey = `${documentTitle}.IT IS AGREED.7. Collective agreements.option_1`;
    updatedFlatDoc[collectiveKey] = "There are no collective agreements relevant to Employee's employment.";
  } else if (formData.hasCollectiveAgreement === "Yes" && formData.collectiveAgreementDetails) {
    const collectiveKey = `${documentTitle}.IT IS AGREED.7. Collective agreements.option_2`;
    updatedFlatDoc[collectiveKey] = `Employee's employment is subject to the following collective agreement ${formData.collectiveAgreementDetails}.`;
  }

  // Holidays
  if (formData.holidayEntitlement) {
    const holidayKey = `${documentTitle}.IT IS AGREED.8. Holidays.8.1.content`;
    let holidayContent = "Employee is entitled to ";
    holidayContent += formData.holidayEntitlement;
    holidayContent += " holiday in each complete calendar year, including bank and public holidays.";
    updatedFlatDoc[holidayKey] = holidayContent;
  }

  if (formData.holidayYearStart || formData.holidayYearEnd) {
    const holidayYearKey = `${documentTitle}.IT IS AGREED.8. Holidays.8.2.content`;
    let holidayYearContent = "The holiday year commences on ";
    holidayYearContent += formData.holidayYearStart || "*[date]*";
    holidayYearContent += " and finishes on ";
    holidayYearContent += formData.holidayYearEnd || "*[date]*";
    holidayYearContent += " each year.";
    updatedFlatDoc[holidayYearKey] = holidayYearContent;
  }

  if (formData.holidayCalculationBasis) {
    const calcKey = `${documentTitle}.IT IS AGREED.8. Holidays.8.4.8.4.1.content`;
    let calcContent = "Employee have exceeded Employee's prorated holiday entitlement, the Employer will deduct a payment in lieu of days holiday taken in excess of Employee's prorated holiday entitlement, on the basis of ";
    calcContent += formData.holidayCalculationBasis;
    calcContent += ", and Employee authorise the Employer to make a deduction from the payment of any final salary.";
    updatedFlatDoc[calcKey] = calcContent;
  }

  if (formData.holidayApprovalManager) {
    const approvalKey = `${documentTitle}.IT IS AGREED.8. Holidays.8.5.content`;
    let approvalContent = "Holidays must be taken at times convenient to the Employer. Employee must obtain approval of proposed holiday dates in advance from ";
    approvalContent += formData.holidayApprovalManager;
    approvalContent += ". Employee will not be allowed to take more than two weeks at any one time, save at the Employer's discretion. Employee must not book holidays until Employee's request for approval has been formally agreed.";
    updatedFlatDoc[approvalKey] = approvalContent;
  }

  if (formData.maxCarryForwardDays) {
    const carryKey = `${documentTitle}.IT IS AGREED.8. Holidays.8.6.content`;
    let carryContent = "All holidays must be taken in the year in which it is accrued. In exceptional circumstances Employee may carry forward up to ";
    carryContent += formData.maxCarryForwardDays;
    carryContent += " days untaken holiday entitlement to the next holiday year. This applies for one year only, and holidays may not be carried forward to a subsequent holiday year.";
    updatedFlatDoc[carryKey] = carryContent;
  }

  if (formData.sickHolidayNotificationManager) {
    const sickHolKey = `${documentTitle}.IT IS AGREED.8. Holidays.8.7.8.7.1.content`;
    let sickHolContent = "Employee must contact ";
    sickHolContent += formData.sickHolidayNotificationManager;
    sickHolContent += " in accordance with the notification of sickness absence procedure as soon as Employee know that Employee's holiday will be affected by sickness or injury;";
    updatedFlatDoc[sickHolKey] = sickHolContent;
  }

  if (formData.sickHolidayNotificationDays) {
    const sickHolDaysKey = `${documentTitle}.IT IS AGREED.8. Holidays.8.7.8.7.3.content`;
    let sickHolDaysContent = "Within ";
    sickHolDaysContent += formData.sickHolidayNotificationDays;
    sickHolDaysContent += " days of Employee's return to work, Employee must confirm in writing how much of Employee's holiday was affected by sickness or injury and the amount of leave Employee wish to take at another time. This written notification must be sent to ";
    sickHolDaysContent += formData.sickHolidayNotificationManager || "*[specify job title]*";
    sickHolDaysContent += ".";
    updatedFlatDoc[sickHolDaysKey] = sickHolDaysContent;
  }

  // Sickness absence
  if (formData.sicknessContactManager || formData.sicknessNotificationTime) {
    const sicknessKey = `${documentTitle}.IT IS AGREED.9. Sickness Absence.9.1.content`;
    let sicknessContent = "In the event of Employee's absence for any reason Employee or someone on Employee's behalf should contact ";
    sicknessContent += formData.sicknessContactManager || "*[specify job title]*";
    sicknessContent += " at the earliest opportunity and no later than ";
    sicknessContent += formData.sicknessNotificationTime || "*[specify a time]*";
    sicknessContent += " on the first day of the absence to inform him/her of the reason for absence. Employee must inform the Employer as soon as possible of any change in the date of Employee's expected return to work.";
    updatedFlatDoc[sicknessKey] = sicknessContent;
  }

  if (formData.fitNoteContactManager) {
    const fitNoteKey = `${documentTitle}.IT IS AGREED.9. Sickness Absence.9.3.content`;
    let fitNoteContent = "For periods of sickness of more than seven consecutive days, including weekends, Employee will be required to obtain a Statement of Fitness for Work ('Fit Note') / Medical Certificate and send this to ";
    fitNoteContent += formData.fitNoteContactManager;
    fitNoteContent += ". A Fit Note / Medical Certificate should be sent to the Employer to cover the period of Employee's sickness absence from work.";
    updatedFlatDoc[fitNoteKey] = fitNoteContent;
  }

  // Sick pay
  if (formData.sickPayType === "Statutory Sick Pay (SSP) only") {
    const sspKey = `${documentTitle}.IT IS AGREED.9. Sickness Absence.9.4.ssp_only.content`;
    let sspContent = "If Employee is absent for four or more days by reason of sickness or incapacity, Employee is entitled to Statutory Sick Pay (SSP), provided that Employee have met the requirements above. For the purposes of the SSP scheme the 'qualifying days' are ";
    sspContent += formData.sspQualifyingDays || "*[state days e.g. Monday to Friday]*";
    sspContent += ". There is no contractual right to payment in respect of periods of absence due to sickness or incapacity. Any such payments are at the discretion of the Employer.";
    updatedFlatDoc[sspKey] = sspContent;
  } else if (formData.sickPayType === "Occupational sick pay scheme") {
    const occupationalKey = `${documentTitle}.IT IS AGREED.9. Sickness Absence.9.4.sick_pay_scheme.content`;
    let occupationalContent = "If Employee is absent through sickness or incapacity, and Employee have complied with the requirements above, Employee will be paid Occupational sick pay, for up to a maximum of ";
    occupationalContent += formData.occupationalSickPayDays || "*[number]*";
    occupationalContent += " days in any calendar year. Occupational sick pay is equal to normal basic salary. Thereafter Employee will receive Statutory Sick Pay in accordance with the law.";
    updatedFlatDoc[occupationalKey] = occupationalContent;
  }

  // Maternity and paternity
  if (formData.maternityPaternityManager) {
    const maternityKey = `${documentTitle}.IT IS AGREED.10. Maternity and Paternity Rights.content`;
    let maternityContent = "The Employer will comply with its statutory obligations with respect to maternity and paternity rights and rights dealing with time off for dependants. The Employer's policies in this regard are available on request from ";
    maternityContent += formData.maternityPaternityManager;
    maternityContent += ".";
    updatedFlatDoc[maternityKey] = maternityContent;
  }

  // Pension
  if (formData.pensionType === "No pension arrangements") {
    const pensionKey = `${documentTitle}.IT IS AGREED.11. Pension.11.1.option_1`;
    updatedFlatDoc[pensionKey] = "There are no pension arrangements applicable to Employee's employment";
  } else if (formData.pensionType === "Designated pension scheme") {
    const pensionKey = `${documentTitle}.IT IS AGREED.11. Pension.11.1.option_2`;
    let pensionContent = "The designated pension scheme is ";
    pensionContent += formData.pensionSchemeName || "*[name]*";
    pensionContent += ". Details can be found in ";
    pensionContent += formData.pensionDetailsLocation || "*[State where e.g. Employee Handbook]*";
    pensionContent += " or obtained from ";
    pensionContent += formData.pensionDetailsContact || "*[specify job title]*";
    pensionContent += "The Employer will make a contribution of ";
    pensionContent += formData.employerPensionContribution || "*[state %]*";
    pensionContent += " of Employee's salary. Employee may contribute up to ";
    pensionContent += formData.employeePensionContribution || "*[state %]*";
    pensionContent += " of Employee's salary.";
    updatedFlatDoc[pensionKey] = pensionContent;
  } else if (formData.pensionType === "Auto-enrolment pension") {
    const pensionKey = `${documentTitle}.IT IS AGREED.11. Pension.11.1.option_3`;
    updatedFlatDoc[pensionKey] = "If Employee is eligible, the Employer will auto-enrol Employee into a pension scheme, in accordance with the Employer's pension auto-enrolment obligations.\n\nFull details of the scheme will be provided when Employee is enrolled, including the minimum contribution level that Employee will be required to make and Employee's right to opt out if Employee do not want to join the scheme. While participating in the scheme, Employee agree to worker pension contributions being deducted from Employee's salary.\n\nThe scheme is subject to its rules as may be amended from time to time, and the Employer may replace the scheme with another pension scheme at any time.";
  }

  if (formData.contractingOutCertificate) {
    const contractingKey = `${documentTitle}.IT IS AGREED.11. Pension.11.2.content`;
    let contractingContent = "A contracting out certificate is ";
    if (formData.contractingOutCertificate === "No") {
      contractingContent += "not";
    }
    contractingContent += " in force.";
    updatedFlatDoc[contractingKey] = contractingContent;
  }

  // Grievance procedure
  if (formData.grievanceProcedureContact) {
    const grievanceKey = `${documentTitle}.IT IS AGREED.15. Grievance Procedure.content`;
    updatedFlatDoc[grievanceKey] = `The formal Grievance Procedure is available on request from ${formData.grievanceProcedureContact}.`;
  }

  // Employee handbook
  if (formData.hasEmployeeHandbook) {
    const handbookKey = `${documentTitle}.IT IS AGREED.22. Changes to Terms and Conditions of Employment.content`;
    let handbookContent = "The Employer may amend, vary or terminate the terms and conditions in this document";
    if (formData.hasEmployeeHandbook === "Yes") {
      handbookContent += " and in the Employee Handbook/Manual";
    }
    handbookContent += ". Any such change to Employee's terms and conditions will be subject to consultation and agreement with Employee and notified to Employee personally in writing.";
    updatedFlatDoc[handbookKey] = handbookContent;
  }

  // Termination
  if (formData.terminationType === "Custom notice periods" && formData.probationaryNoticeMonths) {
    const terminationKey = `${documentTitle}.IT IS AGREED.18. Termination of employment.18.1.option_1`;
    let terminationContent = "During the ";
    terminationContent += formData.probationaryNoticeMonths;
    terminationContent += " months probationary period the notice required by either party to this Contract to terminate Employee's employment will be one week.\n\nAfter the successful completion of any probationary period, Employee's employment may be ended by Employee giving the Employer one month's written notice. The Employer will give Employee one month's written notice and after four years' continuous service a further one week's notice for each additional complete year of service up to a maximum of 12 weeks' notice.\n\n18.2 The Employer reserves the right in their absolute discretion to pay Employee salary in lieu of notice.\n\n18.3 Nothing in this Contract prevents the Employer from terminating Employee's employment summarily or otherwise in the event of any serious breach by Employee of the terms of Employee's employment or in the event of any act or acts of gross misconduct by Employee.";
    updatedFlatDoc[terminationKey] = terminationContent;
  } else if (formData.terminationType === "Statutory notice periods") {
    const statutoryKey = `${documentTitle}.IT IS AGREED.18. Termination of employment.18.1.option_2.content`;
    updatedFlatDoc[statutoryKey] = "Employee's contract of employment may be ended by written notice as follows:";
    const additionalTermsKey = `${documentTitle}.IT IS AGREED.18. Termination of employment.18.1.option_2.additional_terms`;
    updatedFlatDoc[additionalTermsKey] = "The Employer reserves the right in our absolute discretion to pay Employee salary in lieu of notice.\n\nNothing in this Contract prevents the Employer from terminating Employee's employment summarily or otherwise in the event of any serious breach by Employee of the terms of Employee's employment or in the event of any act or acts of gross misconduct by Employee.";
  }

  // Jurisdiction
  if (formData.governingLaw || formData.courtJurisdiction) {
    const jurisdictionKey = `${documentTitle}.IT IS AGREED.24. Jurisdiction.content`;
    let jurisdictionContent = "This Agreement shall be governed by and construed in accordance with ";
    jurisdictionContent += formData.governingLaw || "*[INSERT]*";
    jurisdictionContent += " Law and ";
    jurisdictionContent += formData.courtJurisdiction || "*[INSERT]*";
    jurisdictionContent += " Courts.";
    updatedFlatDoc[jurisdictionKey] = jurisdictionContent;
  }

  // Signatures
  if (formData.employerName || formData.employerSigningName) {
    const empSigKey = `${documentTitle}.SIGNATURES.employer.preamble`;
    updatedFlatDoc[empSigKey] = `Issued for and on behalf of ${formData.employerName || "*[Employer Name]*"}`;
  }

  if (formData.employeeName) {
    const empNameKey = `${documentTitle}.SIGNATURES.employee.name_line`;
    updatedFlatDoc[empNameKey] = formData.employeeName;
  }

  return updatedFlatDoc;
}

function updateDocumentWithFormData(formData) {
  const templateDoc = getDocumentTemplate();
  const flatTemplate = flattenObject(templateDoc);
  const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, formData);
  const updatedDoc = unflattenObject(updatedFlatDoc);
  window.currentDocument = updatedDoc;
}

// COMPLETE HTML conversion with conditional rendering - ALL SECTIONS
function convertToHtml(document, formData = {}) {
  let html = [];
  const documentTitle = Object.keys(document)[0];

  if (documentTitle) {
    const mainContent = document[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSection(section, mainContent[section], 0, documentTitle);
      }
    });
  }
  return html.join("");

  function processSection(key, value, level, path) {
    const currentPath = path ? `${path}.${key}` : key;

    if (key === "TITLE") {
      html.push(
        `<div class="document-title" style="text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 10px;">
          <span data-value-path="${currentPath}.content">${value.content}</span>
        </div>`
      );
      if (value.subtitle) {
        html.push(
          `<div class="document-subtitle" style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 20px;">
            <span data-value-path="${currentPath}.subtitle">${value.subtitle}</span>
          </div>`
        );
      }
    } else if (key === "DATE") {
      html.push(
        `<div class="section-header" style="font-weight: bold; margin-top: 20px; margin-bottom: 10px;">
          DATE
        </div>
        <div class="document-content" data-path="${currentPath}" style="margin-bottom: 15px;">
          <span data-value-path="${currentPath}.content">${value.content}</span>
        </div>`
      );
    } else if (key === "BETWEEN") {
      html.push(
        `<div class="section-header" style="font-weight: bold; margin-top: 20px; margin-bottom: 10px;">
          BETWEEN
        </div>`
      );
      if (value.a) {
        html.push(
          `<div class="document-content" data-path="${currentPath}.a" style="margin-bottom: 10px;">
            (a) <span data-value-path="${currentPath}.a">${value.a}</span>
          </div>`
        );
      }
      if (value.b) {
        html.push(
          `<div class="document-content" data-path="${currentPath}.b" style="margin-bottom: 15px;">
            (b) <span data-value-path="${currentPath}.b">${value.b}</span>
          </div>`
        );
      }
    } else if (key === "IT IS AGREED") {
      html.push(
        `<div class="section-header" style="font-weight: bold; margin-top: 20px; margin-bottom: 10px;">
          IT IS AGREED
        </div>`
      );
      if (value.preamble) {
        html.push(
          `<div class="document-content" style="margin-bottom: 15px;">
            <span data-value-path="${currentPath}.preamble">${value.preamble}</span>
          </div>`
        );
      }
      agreementSectionOrder.forEach((sectionKey) => {
        if (value[sectionKey]) {
          processAgreementSection(sectionKey, value[sectionKey], currentPath);
        }
      });
    } else if (key === "SIGNATURES") {
      html.push(
        `<div class="section-header" style="font-weight: bold; margin-top: 30px; margin-bottom: 20px;">
          SIGNATURES
        </div>`
      );
      if (value.employer) {
        html.push(
          `<div class="signature-block" style="margin-bottom: 30px;">
            <div data-path="${currentPath}.employer.preamble" style="margin-bottom: 10px;">
              <span data-value-path="${currentPath}.employer.preamble">${value.employer.preamble}</span>
            </div>
            <div data-path="${currentPath}.employer.signature_field" style="margin-bottom: 5px;">
              <span data-value-path="${currentPath}.employer.signature_field">${value.employer.signature_field}</span>
            </div>
            <div data-path="${currentPath}.employer.date_field">
              <span data-value-path="${currentPath}.employer.date_field">${value.employer.date_field}</span>
            </div>
          </div>`
        );
      }
      if (value.employee) {
        html.push(
          `<div class="signature-block">
            <div data-path="${currentPath}.employee.preamble" style="font-weight: bold; margin-bottom: 10px;">
              <span data-value-path="${currentPath}.employee.preamble">${value.employee.preamble}</span>
            </div>
            <div data-path="${currentPath}.employee.declaration" style="margin-bottom: 15px;">
              <span data-value-path="${currentPath}.employee.declaration">${value.employee.declaration}</span>
            </div>
            <div data-path="${currentPath}.employee.signature_field" style="margin-bottom: 5px;">
              <span data-value-path="${currentPath}.employee.signature_field">${value.employee.signature_field}</span>
            </div>
            <div data-path="${currentPath}.employee.date_field" style="margin-bottom: 10px;">
              <span data-value-path="${currentPath}.employee.date_field">${value.employee.date_field}</span>
            </div>
            <div data-path="${currentPath}.employee.name_line">
              <span data-value-path="${currentPath}.employee.name_line">${value.employee.name_line}</span>
            </div>
          </div>`
        );
      }
    }
  }

  function processAgreementSection(key, value, parentPath) {
    const currentPath = `${parentPath}.${key}`;
    html.push(
      `<div class="agreement-section" style="margin-bottom: 20px;">
        <div class="subsection-header" style="font-weight: bold; margin-bottom: 10px;">
          ${key}
        </div>
      </div>`
    );
    if (typeof value === "object" && value !== null) {
      processSubSection(key, value, parentPath);
    }
  }

  function processSubSection(key, value, parentPath) {
    const currentPath = `${parentPath}.${key}`;

    if (typeof value === "string") {
      html.push(
        `<div class="document-content" data-path="${currentPath}" style="margin-bottom: 12px; line-height: 1.6;">
          <span data-value-path="${currentPath}">${value}</span>
        </div>`
      );
    } else if (typeof value === "object" && value !== null) {
      Object.keys(value).forEach(nestedKey => {
        const nestedValue = value[nestedKey];
        const nestedPath = `${currentPath}.${nestedKey}`;
        
        if (typeof nestedValue === "string") {
          if (shouldSkipConditionalContent(nestedKey, currentPath, formData)) {
            return;
          }

          if (nestedKey.match(/^\d+\.\d+$/) || nestedKey.match(/^\d+\.\d+\.\d+$/)) {
            html.push(
              `<div class="document-content" data-path="${nestedPath}" style="margin-left: 20px; margin-bottom: 10px;">
                <strong>${nestedKey}</strong> <span data-value-path="${nestedPath}">${nestedValue}</span>
              </div>`
            );
          } else if (shouldShowORDivider(nestedKey, currentPath, formData)) {
            html.push(
              `<div class="document-content" style="text-align: center; font-weight: bold; margin: 10px 0;">
                <span>${nestedValue}</span>
              </div>`
            );
          } else if (nestedKey === "either") {
            html.push(
              `<div class="document-content" style="font-weight: bold; margin: 10px 0;">
                <span>${nestedValue}</span>
              </div>`
            );
          } else if (nestedKey === "header") {
            if (shouldShowHeader(nestedKey, currentPath, formData)) {
              html.push(
                `<div class="document-content" style="font-weight: bold; margin: 15px 0 10px 0;">
                  <span>${nestedValue}</span>
                </div>`
              );
            }
          } else {
            html.push(
              `<div class="document-content" data-path="${nestedPath}" style="margin-bottom: 10px; line-height: 1.6;">
                <span data-value-path="${nestedPath}">${nestedValue}</span>
              </div>`
            );
          }
        } else if (typeof nestedValue === "object" && nestedValue !== null) {
          if (nestedKey === "table") {
            html.push(renderNoticeTable(nestedValue, nestedPath));
          } else if (nestedKey === "option_2" && nestedPath.includes("18.1") && formData.terminationType === "Statutory notice periods") {
            processStatutoryTerminationSection(nestedValue, nestedPath);
          } else if (!shouldSkipConditionalContent(nestedKey, currentPath, formData)) {
            processSubSection(nestedKey, nestedValue, currentPath);
          }
        }
      });
    }
  }

  function processStatutoryTerminationSection(sectionValue, sectionPath) {
    if (sectionValue.content) {
      html.push(
        `<div class="document-content" data-path="${sectionPath}.content" style="margin-bottom: 15px; line-height: 1.6;">
          <span data-value-path="${sectionPath}.content">${sectionValue.content}</span>
        </div>`
      );
    }
    if (sectionValue.notice_by_employer) {
      if (sectionValue.notice_by_employer.header) {
        html.push(
          `<div class="document-content" style="font-weight: bold; margin: 15px 0 10px 0;">
            <span>${sectionValue.notice_by_employer.header}</span>
          </div>`
        );
      }
      if (sectionValue.notice_by_employer.table) {
        html.push(renderNoticeTable(sectionValue.notice_by_employer.table, `${sectionPath}.notice_by_employer.table`));
      }
    }
    if (sectionValue.notice_by_employee) {
      if (sectionValue.notice_by_employee.header) {
        html.push(
          `<div class="document-content" style="font-weight: bold; margin: 15px 0 10px 0;">
            <span>${sectionValue.notice_by_employee.header}</span>
          </div>`
        );
      }
      if (sectionValue.notice_by_employee.table) {
        html.push(renderNoticeTable(sectionValue.notice_by_employee.table, `${sectionPath}.notice_by_employee.table`));
      }
    }
    if (sectionValue.additional_terms) {
      html.push(
        `<div class="document-content" style="margin-top: 15px; line-height: 1.6;">
          <span>${sectionValue.additional_terms}</span>
        </div>`
      );
    }
  }
}

function updatePreview() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) {
    console.error("Preview element not found");
    return;
  }
  try {
    const html = convertToHtml(window.currentDocument, formDataStore);
    previewElem.innerHTML = html;
  } catch (error) {
    console.error("Error updating preview:", error);
    previewElem.innerHTML = '<div class="error">Error loading document preview</div>';
  }
}

// Highlighting functions
function highlightDocumentSection(fieldId) {
  clearHighlights();
  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;
  const previewElem = document.getElementById("documentPreview");
  paths.forEach(path => {
    let elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);
    if (elements.length === 0) {
      const pathParts = path.split('.');
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const partialPath = pathParts.slice(0, i + 1).join('.');
        elements = previewElem.querySelectorAll(`[data-path="${partialPath}"]`);
        if (elements.length > 0) break;
      }
    }
    elements.forEach(elem => {
      elem.classList.add("highlighted-section");
    });
  });
  setTimeout(() => {
    const firstHighlighted = document.querySelector(".highlighted, .highlighted-section");
    if (firstHighlighted) {
      firstHighlighted.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 1);
}

function clearHighlights() {
  const previewElem = document.getElementById("documentPreview");
  const highlightedElements = previewElem.querySelectorAll(".highlighted, .highlighted-section");
  highlightedElements.forEach(element => {
    element.classList.remove("highlighted");
    element.classList.remove("highlighted-section");
  });
}

// Form handling functions
function showQuestionnaire() {
  const container = document.getElementById("keyContainer");
  container.innerHTML = "";
  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= 10; stepNumber++) {
    const stepData = documentQuestions[`step${stepNumber}`];
    allQuestionsHTML += `
      <div class="questionnaire-section">
        <h3>${stepData.title}</h3>
        <div class="step-content">
          ${createQuestionsHTML(stepData)}
        </div>
      </div>
    `;
  }
  container.innerHTML = allQuestionsHTML;

  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach((input) => {
    input.addEventListener("input", function () {
      formDataStore[this.id] = this.value;
      if (this.id === "hasPreviousEmployment" || this.id === "employmentType" || 
          this.id === "dutiesType" || this.id === "overtimeEntitled" ||
          this.id === "hasCollectiveAgreement" || this.id === "sickPayType" ||
          this.id === "pensionType" || this.id === "hasEmployeeHandbook" ||
          this.id === "terminationType" || this.id === "contractingOutCertificate") {
        handleConditionalFieldChange(this);
      } else {
        updateDocumentWithFormData(formDataStore);
        updatePreview();
      }
      autoSaveFormData();
    });

    input.addEventListener("change", function () {
      formDataStore[this.id] = this.value;
      highlightDocumentSection(this.id);
      if (this.id === "hasPreviousEmployment" || this.id === "employmentType" || 
          this.id === "dutiesType" || this.id === "overtimeEntitled" ||
          this.id === "hasCollectiveAgreement" || this.id === "sickPayType" ||
          this.id === "pensionType" || this.id === "hasEmployeeHandbook" ||
          this.id === "terminationType" || this.id === "contractingOutCertificate") {
        handleConditionalFieldChange(this);
      } else {
        updateDocumentWithFormData(formDataStore);
        updatePreview();
      }
    });
  });

  restoreFormData();
  registerHighlightEvents();
}

function createQuestionsHTML(stepData) {
  let html = "";
  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;
    html += createQuestionField(key, data);
  }
  return html;
}

function createQuestionField(key, data, sectionClass = "") {
  if (!data.question) return "";
  let visibilityAttr = "";
  if (data.showIf) {
    const [condition, value] = data.showIf.split("=");
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}" style="display: none;"`;
  }
  const affectedPaths = documentPathMap[key] ? 
    `data-affects-path="${documentPathMap[key].join(',')}"` : "";

  switch (data.type) {
    case "textarea":
      return `
        <div class="question-field ${sectionClass}" ${visibilityAttr}>
          <label>${data.question}</label>
          <textarea id="${key}" class="form-textarea" placeholder="${data.placeholder || ''}" ${affectedPaths}></textarea>
        </div>
      `;
    case "date":
      return `
        <div class="question-field ${sectionClass}" ${visibilityAttr}>
          <label>${data.question}</label>
          <input type="date" id="${key}" ${affectedPaths}>
        </div>
      `;
    case "select":
      return `
        <div class="question-field ${sectionClass}" ${visibilityAttr}>
          <label>${data.question}</label>
          <select id="${key}" ${affectedPaths}>
            <option value="">Select...</option>
            ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
          </select>
        </div>
      `;
    default:
      return `
        <div class="question-field ${sectionClass}" ${visibilityAttr}>
          <label>${data.question}</label>
          <input type="text" id="${key}" placeholder="${data.placeholder || ''}" ${affectedPaths}>
        </div>
      `;
  }
}

function handleConditionalFieldChange(selectElement) {
  formDataStore[selectElement.id] = selectElement.value;
  const condition = selectElement.id;
  const value = selectElement.value;
  document.querySelectorAll(`[data-show-if="${condition}"]`).forEach((field) => {
    const showValue = field.getAttribute("data-show-value");
    field.style.display = showValue === value ? "block" : "none";
  });
  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);
}

function restoreFormData() {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];
      if (input.tagName === "SELECT") {
        handleConditionalFieldChange(input);
      }
    }
  });
}

function registerHighlightEvents() {
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach(input => {
    input.addEventListener("focus", function() {
      highlightDocumentSection(this.id);
    });
    input.addEventListener("input", function() {
      highlightDocumentSection(this.id);
    });
    input.addEventListener("blur", function() {
      setTimeout(() => {
        if (!document.activeElement || !document.activeElement.hasAttribute("data-affects-path")) {
          clearHighlights();
        }
      }, 100);
    });
  });
}

// AI editing functions
function handleTextSelection() {
  const selection = window.getSelection();
  if (selection.toString().trim().length > 0 &&
      document.getElementById("documentPreview").contains(selection.anchorNode)) {
    selectedText = selection.toString();
    selectionRange = selection.getRangeAt(0);
    const rect = selectionRange.getBoundingClientRect();
    showEditWithAIButton(rect);
  } else {
    const editButton = document.getElementById("edit-ai-button");
    if (editButton) {
      editButton.remove();
    }
  }
}

function showEditWithAIButton(rect) {
  const existingButton = document.getElementById("edit-ai-button");
  if (existingButton) {
    existingButton.remove();
  }
  const editButton = document.createElement("div");
  editButton.id = "edit-ai-button";
  editButton.className = "floating-edit-button";
  editButton.innerHTML = `<button class="btn btn-edit">Edit with AI</button>`;
  editButton.style.position = "absolute";
  editButton.style.left = `${rect.left + window.scrollX}px`;
  editButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
  editButton.style.zIndex = "1000";
  editButton.querySelector("button").addEventListener("click", openEditDialog);
  document.body.appendChild(editButton);
}

function openEditDialog() {
  let dialog = document.getElementById("edit-ai-dialog");
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = "edit-ai-dialog";
    dialog.className = "modal";
    dialog.innerHTML = `
      <div class="modal-content">
        <span class="close" onclick="closeEditDialog()">&times;</span>
        <h3>Edit with AI</h3>
        <div class="edit-dialog-body">
          <div>
            <p><strong>Selected Text:</strong></p>
            <div id="selected-text-display" class="selected-text-box"></div>
          </div>
          <div>
            <p><strong>How would you like to modify this text?</strong></p>
            <textarea id="ai-edit-prompt" class="prompt-input" placeholder="Enter your instructions for the AI..."></textarea>
          </div>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-cancel" onclick="closeEditDialog()">Cancel</button>
          <button class="btn btn-edit" id="submit-ai-edit">Update Text</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    document.getElementById("submit-ai-edit").addEventListener("click", submitAIEditRequest);
  }
  document.getElementById("selected-text-display").textContent = selectedText;
  dialog.style.display = "block";
  const editButton = document.getElementById("edit-ai-button");
  if (editButton) {
    editButton.remove();
  }
}

function closeEditDialog() {
  const dialog = document.getElementById("edit-ai-dialog");
  if (dialog) {
    dialog.style.display = "none";
    document.getElementById("ai-edit-prompt").value = "";
  }
}

function submitAIEditRequest() {
  const prompt = document.getElementById("ai-edit-prompt").value;
  if (!prompt.trim()) {
    alert("Please enter instructions for the AI.");
    return;
  }
  const fullContent = document.getElementById("documentPreview").innerHTML;
  const submitButton = document.getElementById("submit-ai-edit");
  const originalText = submitButton.textContent;
  submitButton.textContent = "Processing...";
  submitButton.disabled = true;

  fetch("/update_value", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selectedText: selectedText,
      prompt: prompt,
      fullContent: fullContent,
    }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((data) => {
      if (data.error) throw new Error(data.error);
      updateDocumentWithAIResponse(data.value);
      closeEditDialog();
    })
    .catch((error) => {
      alert("Error: " + error.message);
    })
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function updateDocumentWithAIResponse(newText) {
  if (!selectionRange) return;
  selectionRange.deleteContents();
  const textNode = document.createTextNode(newText);
  selectionRange.insertNode(textNode);
  selectedText = "";
  selectionRange = null;
  const successMessage = document.createElement("div");
  successMessage.className = "success";
  successMessage.textContent = "Text updated successfully";
  successMessage.style.position = "fixed";
  successMessage.style.bottom = "20px";
  successMessage.style.right = "20px";
  successMessage.style.padding = "10px 20px";
  document.body.appendChild(successMessage);
  setTimeout(() => {
    successMessage.remove();
  }, 3000);
}

// Export and utility functions
function downloadWordDocx() {
  const content = document.getElementById("documentPreview").innerHTML;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Employee Contract</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #333;
          margin: 1in;
        }
        .document-title {
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 10pt;
        }
        .document-subtitle {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 20pt;
        }
        .section-header {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 20pt;
          margin-bottom: 10pt;
        }
        .subsection-header {
          font-weight: bold;
          margin-top: 15pt;
          margin-bottom: 10pt;
        }
        .document-content {
          margin-bottom: 12pt;
          line-height: 1.6;
        }
        .signature-block {
          margin-top: 30pt;
          margin-bottom: 20pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15pt 0;
        }
        th, td {
          border: 1pt solid #333;
          padding: 8pt;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
  const converted = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(converted);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Employee_Contract.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toggleEditMode() {
  const previewElem = document.getElementById("documentPreview");
  const toggle = document.getElementById("editModeToggle");
  if (!previewElem) return;
  if (toggle && toggle.checked) {
    previewElem.contentEditable = true;
    previewElem.classList.add("editable");
    showNotification("Edit mode enabled. You can now directly edit the document text.");
  } else {
    previewElem.contentEditable = false;
    previewElem.classList.remove("editable");
    showNotification("Edit mode disabled. Changes made in edit mode remain.");
  }
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  notification.style.color = "white";
  notification.style.padding = "10px 15px";
  notification.style.borderRadius = "4px";
  notification.style.zIndex = "1000";
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

function autoSaveFormData() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    try {
      if (typeof Storage !== "undefined") {
        localStorage.setItem('employeeContractFormData_autosave', JSON.stringify(formDataStore));
      }
    } catch (error) {
      console.error("Error auto-saving form data:", error);
    }
  }, 2000);
}

// Main initialization function - Called after DOM loads
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Employee Contract document initialization started");
  
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Employee Contract": {} };
  }

  try {
    initializeDocumentTemplate();
    showQuestionnaire();
    updatePreview();
    
    setTimeout(() => {
      registerHighlightEvents();
      updateDocumentWithFormData(formDataStore);
      updatePreview();
    }, 500);

    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    // Load auto-saved data if available
    if (typeof Storage !== "undefined" && localStorage.getItem('employeeContractFormData_autosave')) {
      try {
        const autoSavedData = JSON.parse(localStorage.getItem('employeeContractFormData_autosave'));
        if (Object.keys(autoSavedData).length > 0) {
          const shouldRestore = confirm("Auto-saved form data found. Would you like to restore it?");
          if (shouldRestore) {
            formDataStore = autoSavedData;
            restoreFormData();
            updateDocumentWithFormData(formDataStore);
            updatePreview();
            showNotification("Auto-saved data restored successfully");
          }
        }
      } catch (error) {
        console.error("Error loading auto-saved data:", error);
      }
    }

    console.log("Employee Contract document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Additional utility functions
function validateFormCompleteness() {
  const requiredFields = [
    'contractDate', 'employerName', 'employerJurisdiction', 'employerRegNumber', 
    'employerAddress', 'employeeName', 'employeeAddress', 'employmentType', 
    'employmentStartDate', 'jobTitle', 'workStartTime', 'workEndTime', 
    'workLocation', 'annualSalary', 'paymentFrequency', 'paymentDay', 
    'paymentMethod', 'governingLaw', 'courtJurisdiction'
  ];
  
  const missingFields = requiredFields.filter(field => !formDataStore[field] || formDataStore[field].trim() === '');
  
  if (missingFields.length > 0) {
    console.warn("Missing required fields:", missingFields);
    return false;
  }
  
  return true;
}

function refreshPreview() {
  updateDocumentWithFormData(formDataStore);
  updatePreview();
  
  setTimeout(() => {
    const highlighted = document.querySelector(".highlighted-section");
    if (highlighted) {
      highlighted.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
}

function validateAndUpdateDocument() {
  try {
    updateDocumentWithFormData(formDataStore);
    updatePreview();
    
    if (validateFormCompleteness()) {
      showNotification("Document updated successfully. All required fields completed.");
    }
  } catch (error) {
    console.error("Error updating document:", error);
    showNotification("Error updating document. Please check your inputs.");
  }
}

function printDocument() {
  try {
    const content = document.getElementById("documentPreview").innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Contract</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #333;
            margin: 1in;
          }
          .document-title {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 10pt;
          }
          .document-subtitle {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 20pt;
          }
          .section-header {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 20pt;
            margin-bottom: 10pt;
          }
          .subsection-header {
            font-weight: bold;
            margin-top: 15pt;
            margin-bottom: 10pt;
          }
          .document-content {
            margin-bottom: 12pt;
            line-height: 1.6;
          }
          .signature-block {
            margin-top: 30pt;
            margin-bottom: 20pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15pt 0;
          }
          th, td {
            border: 1pt solid #333;
            padding: 8pt;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          @media print {
            body { margin: 0.5in; }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    console.error("Error printing document:", error);
    showNotification("Error printing document");
  }
}

function saveFormDataToLocalStorage() {
  try {
    if (typeof Storage !== "undefined") {
      localStorage.setItem('employeeContractFormData', JSON.stringify(formDataStore));
      showNotification("Form data saved successfully");
    } else {
      showNotification("Local storage not supported");
    }
  } catch (error) {
    console.error("Error saving form data:", error);
    showNotification("Error saving form data");
  }
}

function loadFormDataFromLocalStorage() {
  try {
    if (typeof Storage !== "undefined") {
      const savedData = localStorage.getItem('employeeContractFormData');
      if (savedData) {
        formDataStore = JSON.parse(savedData);
        restoreFormData();
        updateDocumentWithFormData(formDataStore);
        updatePreview();
        showNotification("Form data loaded successfully");
      } else {
        showNotification("No saved form data found");
      }
    } else {
      showNotification("Local storage not supported");
    }
  } catch (error) {
    console.error("Error loading form data:", error);
    showNotification("Error loading form data");
  }
}

function clearFormData() {
  try {
    formDataStore = {};
    if (typeof Storage !== "undefined") {
      localStorage.removeItem('employeeContractFormData');
      localStorage.removeItem('employeeContractFormData_autosave');
    }
    
    document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach(input => {
      input.value = '';
      if (input.hasAttribute('data-show-if')) {
        input.style.display = 'none';
      }
    });
    
    window.currentDocument = getDocumentTemplate();
    updatePreview();
    showNotification("Form data cleared successfully");
  } catch (error) {
    console.error("Error clearing form data:", error);
    showNotification("Error clearing form data");
  }
}

function searchDocumentContent(searchTerm) {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem || !searchTerm.trim()) return;

  clearHighlights();

  const walker = document.createTreeWalker(
    previewElem,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }

  let found = false;
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    
    if (index !== -1) {
      const parent = textNode.parentElement;
      parent.classList.add("search-highlight");
      
      if (!found) {
        parent.scrollIntoView({ behavior: "smooth", block: "center" });
        found = true;
      }
    }
  });

  if (found) {
    showNotification(`Found "${searchTerm}" in document`);
  } else {
    showNotification(`"${searchTerm}" not found in document`);
  }
}

function compareWithTemplate() {
  try {
    const currentDoc = JSON.stringify(window.currentDocument, null, 2);
    const templateDoc = JSON.stringify(getDocumentTemplate(), null, 2);
    
    if (currentDoc === templateDoc) {
      showNotification("Document matches template - no changes made");
    } else {
      showNotification("Document has been modified from template");
    }
    
    console.log("Document comparison completed");
  } catch (error) {
    console.error("Error comparing documents:", error);
    showNotification("Error comparing documents");
  }
}

function checkDocumentIntegrity() {
  try {
    const requiredSections = sectionOrder;
    const currentSections = Object.keys(window.currentDocument["Employee Contract"] || {});
    
    const missingSections = requiredSections.filter(section => !currentSections.includes(section));
    
    if (missingSections.length > 0) {
      console.warn("Missing document sections:", missingSections);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking document integrity:", error);
    return false;
  }
}

function goToStep(stepNumber) {
  const stepElement = document.querySelector(`#keyContainer .questionnaire-section:nth-child(${stepNumber})`);
  if (stepElement) {
    stepElement.scrollIntoView({ behavior: "smooth", block: "start" });
    showNotification(`Navigated to Step ${stepNumber}`);
  }
}

function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      saveFormDataToLocalStorage();
    }
    
    if (event.ctrlKey && event.key === 'p') {
      event.preventDefault();
      printDocument();
    }
    
    if (event.ctrlKey && event.key === 'e') {
      event.preventDefault();
      toggleEditMode();
    }
    
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault();
      const searchTerm = prompt("Search document:");
      if (searchTerm) {
        searchDocumentContent(searchTerm);
      }
    }
  });
}

// Initialize keyboard shortcuts after DOM load
setTimeout(() => {
  initializeKeyboardShortcuts();
  console.log("Keyboard shortcuts initialized");
}, 1000);

// Expose functions to global scope
window.showQuestionnaire = showQuestionnaire;
window.handleConditionalFieldChange = handleConditionalFieldChange;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.closeEditDialog = closeEditDialog;
window.toggleEditMode = toggleEditMode;
window.downloadWordDocx = downloadWordDocx;
window.printDocument = printDocument;
window.saveFormDataToLocalStorage = saveFormDataToLocalStorage;
window.loadFormDataFromLocalStorage = loadFormDataFromLocalStorage;
window.clearFormData = clearFormData;
window.validateFormCompleteness = validateFormCompleteness;
window.refreshPreview = refreshPreview;
window.searchDocumentContent = searchDocumentContent;
window.compareWithTemplate = compareWithTemplate;
window.goToStep = goToStep;
window.checkDocumentIntegrity = checkDocumentIntegrity;
window.validateAndUpdateDocument = validateAndUpdateDocument;
        