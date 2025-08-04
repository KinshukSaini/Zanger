// Document order configuration
const sectionOrder = [
  "DOCUMENT_TITLE",
  "SECTION_I_PARTNERSHIP_DETAILS",
  "SECTION_II_THE_PARTNERS", 
  "SECTION_III_VOTING",
  "SECTION_IV_PARTNER_DUTIES",
  "SECTION_V_ORGANIZATIONAL_MATTERS",
  "SECTION_VI_INVOLUNTARY_WITHDRAWAL",
  "SECTION_VII_TAXES",
  "SECTION_VIII_DISSOLUTION",
  "SECTION_IX_BANKING",
  "SECTION_X_FORCE_MAJEURE",
  "SECTION_XI_NOTICES",
  "SECTION_XII_INDEMNIFICATION",
  "SECTION_XIII_GOVERNING_LAW",
  "SECTION_XIV_SEVERABILITY",
  "SECTION_XV_DISPUTES",
  "SECTION_XVI_ADDITIONAL_TERMS",
  "SECTION_XVII_ENTIRE_AGREEMENT",
  "SIGNATURE_SECTION"
];

// Smart label detection patterns
const INTERNAL_FIELDS_TO_HIDE = ["section_number", "section_title", "intro_text", "subsections", "partners", "withdrawal_circumstances", "dissolution_methods", "partner_signatures", "witness_clause"];
const NUMBERED_PATTERN = /^\d+$/; // Show "1.", "2.", etc.
const CLAUSE_PATTERN = /^\d+\.\d+$/; // Show "1.1:", "2.1:", etc.
const LETTER_PATTERN = /^[a-z]$/; // Show "(a)", "(b)", etc.
const ROMAN_PATTERN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/; // Roman numerals

// Document template to store original structure
let documentTemplate = null;

/**
 * Flattens a nested object into a flat object with dot notation keys
 */
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

/**
 * Unflatten a flat object with dot notation keys back into a nested object
 */
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

/**
 * Initialize the document template
 */
function initializeDocumentTemplate() {
  documentTemplate = JSON.parse(JSON.stringify(window.currentDocument));
}

/**
 * Get a clean copy of the document template
 */
function getDocumentTemplate() {
  if (!documentTemplate) {
    initializeDocumentTemplate();
  }
  return JSON.parse(JSON.stringify(documentTemplate));
}

// Global variables for AI editing
let selectedText = "";
let selectionRange = null;

function handleTextSelection() {
  const selection = window.getSelection();

  if (
    selection.toString().trim().length > 0 &&
    document.getElementById("documentPreview").contains(selection.anchorNode)
  ) {
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

// Enhanced questionnaire for LLP Agreement
const documentQuestions = {
  step1: {
    title: "Basic Partnership Information",
    agreementDate: {
      question: "Enter the agreement date",
      type: "date",
      required: true
    },
    partnershipName: {
      question: "Enter the name of the partnership",
      type: "text",
      placeholder: "e.g., Smith & Johnson LLP",
      required: true
    },
    formationState: {
      question: "Enter the state where the partnership is formed",
      type: "text",
      placeholder: "e.g., California",
      required: true
    },
    mailingAddress: {
      question: "Enter the principal place of business (mailing address)",
      type: "textarea",
      placeholder: "Full business address",
      required: true,
      rows: 3
    },
    businessPurpose: {
      question: "Enter the partnership's primary business purpose",
      type: "textarea",
      placeholder: "Describe the main business activities and objectives",
      required: true,
      rows: 4
    },
    startDate: {
      question: "Enter the effective start date",
      type: "date",
      required: true
    },
    termType: {
      question: "Select the term type for this agreement",
      type: "select",
      options: ["In Perpetuity", "Fixed Term"],
      required: true
    },
    endDate: {
      question: "Enter the end date (for fixed-term agreements)",
      type: "date",
      showIf: "termType=Fixed Term"
    },
  },
  step2: {
    title: "Partner Information",
    partnerCount: {
      question: "How many partners will there be? (Maximum 3 for this template)",
      type: "select",
      options: ["1", "2", "3"],
      required: true
    },
    // Partner 1
    partner1Name: {
      question: "Partner 1 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "partnerCount",
      required: true
    },
    partner1Address: {
      question: "Partner 1 - Mailing Address",
      type: "textarea",
      placeholder: "Full mailing address",
      showIf: "partnerCount",
      required: true,
      rows: 2
    },
    partner1Ownership: {
      question: "Partner 1 - Ownership Percentage",
      type: "number",
      placeholder: "e.g., 50",
      showIf: "partnerCount",
      required: true,
      min: 0,
      max: 100
    },
    partner1Capital: {
      question: "Partner 1 - Capital Contribution ($)",
      type: "number",
      placeholder: "e.g., 25000",
      showIf: "partnerCount",
      required: true,
      min: 0
    },
    partner1Signing: {
      question: "Partner 1 - Signing Authority",
      type: "select",
      options: ["Yes", "No"],
      showIf: "partnerCount",
      required: true
    },
    // Partner 2
    partner2Name: {
      question: "Partner 2 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "partnerCount",
      minPartners: 2
    },
    partner2Address: {
      question: "Partner 2 - Mailing Address",
      type: "textarea",
      placeholder: "Full mailing address",
      showIf: "partnerCount",
      minPartners: 2,
      rows: 2
    },
    partner2Ownership: {
      question: "Partner 2 - Ownership Percentage",
      type: "number",
      placeholder: "e.g., 30",
      showIf: "partnerCount",
      minPartners: 2,
      min: 0,
      max: 100
    },
    partner2Capital: {
      question: "Partner 2 - Capital Contribution ($)",
      type: "number",
      placeholder: "e.g., 15000",
      showIf: "partnerCount",
      minPartners: 2,
      min: 0
    },
    partner2Signing: {
      question: "Partner 2 - Signing Authority",
      type: "select",
      options: ["Yes", "No"],
      showIf: "partnerCount",
      minPartners: 2
    },
    // Partner 3
    partner3Name: {
      question: "Partner 3 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "partnerCount",
      minPartners: 3
    },
    partner3Address: {
      question: "Partner 3 - Mailing Address",
      type: "textarea",
      placeholder: "Full mailing address",
      showIf: "partnerCount",
      minPartners: 3,
      rows: 2
    },
    partner3Ownership: {
      question: "Partner 3 - Ownership Percentage",
      type: "number",
      placeholder: "e.g., 20",
      showIf: "partnerCount",
      minPartners: 3,
      min: 0,
      max: 100
    },
    partner3Capital: {
      question: "Partner 3 - Capital Contribution ($)",
      type: "number",
      placeholder: "e.g., 10000",
      showIf: "partnerCount",
      minPartners: 3,
      min: 0
    },
    partner3Signing: {
      question: "Partner 3 - Signing Authority",
      type: "select",
      options: ["Yes", "No"],
      showIf: "partnerCount",
      minPartners: 3
    },
  },
  step3: {
    title: "Voting and Decision Making",
    votingBasis: {
      question: "How should voting be determined?",
      type: "select",
      options: ["Ownership", "Equal Vote"],
      required: true
    },
    changesVote: {
      question: "What vote is required for partnership changes?",
      type: "select",
      options: ["Majority Vote", "2/3 Vote", "Unanimous Vote", "Other"],
      required: true
    },
    changesVoteOther: {
      question: "Specify other voting requirement for changes",
      type: "text",
      placeholder: "e.g., 75% vote",
      showIf: "changesVote=Other"
    },
    auditVote: {
      question: "What vote is required for accounting audits?",
      type: "select",
      options: ["Majority Vote", "2/3 Vote", "Unanimous Vote", "Other"],
      required: true
    },
    auditVoteOther: {
      question: "Specify other voting requirement for audits",
      type: "text",
      placeholder: "e.g., Any partner can request",
      showIf: "auditVote=Other"
    },
  },
  step4: {
    title: "Partner Duties and Responsibilities",
    expenseResponsibility: {
      question: "How should costs and expenses be handled?",
      type: "select",
      options: ["All Partners based on ownership interest", "All Partners equally", "Other"],
      required: true
    },
    expenseOther: {
      question: "Specify other expense arrangement",
      type: "textarea",
      placeholder: "Describe the custom expense arrangement",
      showIf: "expenseResponsibility=Other",
      rows: 3
    },
    conflictOfInterest: {
      question: "Can partners engage in similar business activities?",
      type: "select",
      options: ["Not be able to engage in similar business activities", "Be able to engage in similar business activities"],
      required: true
    },
    managementStructure: {
      question: "Who will manage day-to-day activities?",
      type: "select",
      options: ["All Partners", "Specific Partners"],
      required: true
    },
    managingPartners: {
      question: "Specify which partners will manage day-to-day activities",
      type: "text",
      placeholder: "e.g., John Smith, Jane Doe",
      showIf: "managementStructure=Specific Partners"
    },
    workRequirements: {
      question: "Which partners are required to work for the partnership?",
      type: "select",
      options: ["No Partners", "All Partners", "Specific Partners"],
      required: true
    },
    workingPartners: {
      question: "Specify which partners are required to work",
      type: "text",
      placeholder: "e.g., John Smith, Jane Doe",
      showIf: "workRequirements=Specific Partners"
    },
    withdrawalNotice: {
      question: "How many days' notice is required for voluntary withdrawal?",
      type: "number",
      placeholder: "e.g., 30",
      required: true,
      min: 1
    },
  },
  step5: {
    title: "Organizational Matters",
    profitDistribution: {
      question: "How should profits be distributed?",
      type: "select",
      options: ["A Partner's percentage of ownership", "Custom percentages assigned to each Partner"],
      required: true
    },
    customProfitAssignment: {
      question: "Enter the profit assignment for each partner",
      type: "textarea",
      placeholder: "e.g., Partner 1: 40%, Partner 2: 35%, Partner 3: 25%",
      showIf: "profitDistribution=Custom percentages assigned to each Partner",
      rows: 3
    },
    partnershipRefusalDays: {
      question: "Days' notice for partnership right of first refusal",
      type: "number",
      placeholder: "e.g., 30",
      required: true,
      min: 1
    },
    partnersRefusalDays: {
      question: "Days' notice for partners' right of first refusal",
      type: "number",
      placeholder: "e.g., 15",
      required: true,
      min: 1
    },
    meetingType: {
      question: "What type of regular meetings will the partnership have?",
      type: "select",
      options: ["Scheduled meetings", "Meetings only when needed"],
      required: true
    },
    meetingFrequency: {
      question: "How often will scheduled meetings occur?",
      type: "select",
      options: ["Weekly", "Monthly", "Quarterly", "Annually", "Other"],
      showIf: "meetingType=Scheduled meetings"
    },
    meetingFrequencyOther: {
      question: "Specify other meeting frequency",
      type: "text",
      placeholder: "e.g., Bi-monthly",
      showIf: "meetingFrequency=Other"
    },
    specialMeetingRequest: {
      question: "Who can request special meetings?",
      type: "select",
      options: ["Any Partner", "Specific Partner(s)", "Other"],
      required: true
    },
    specialMeetingPartners: {
      question: "Specify which partners can request special meetings",
      type: "text",
      placeholder: "e.g., Managing Partners only",
      showIf: "specialMeetingRequest=Specific Partner(s)"
    },
    specialMeetingOther: {
      question: "Specify other special meeting arrangement",
      type: "text",
      placeholder: "e.g., Any 2 partners together",
      showIf: "specialMeetingRequest=Other"
    },
    taxYearEnd: {
      question: "Enter the partnership's tax year end date",
      type: "date",
      required: true
    },
    capitalContributionDeadline: {
      question: "Enter the deadline for capital contributions",
      type: "date",
      required: true
    },
    accountingMethod: {
      question: "Select the accounting method",
      type: "select",
      options: ["Accrual Basis", "Cash Basis"],
      required: true
    },
    annualReports: {
      question: "Select required annual reports (check all that apply)",
      type: "checkbox",
      options: ["Balance Sheet", "Income Statement", "Cash Flow Statement", "Profit and Loss (summary)"],
      required: true
    },
  },
  step6: {
    title: "Legal and Administrative",
    governingState: {
      question: "Enter the governing state for this agreement",
      type: "text",
      placeholder: "e.g., California",
      required: true
    },
    additionalTerms: {
      question: "Enter any additional terms (optional)",
      type: "textarea",
      placeholder: "Any additional clauses or terms specific to this partnership",
      rows: 4
    },
  },
};

// Document path mapping for LLP Agreement fields
const documentPathMap = {
  // Basic Partnership Information
  "agreementDate": ["Limited Liability Partnership Agreement.SECTION_I_PARTNERSHIP_DETAILS.agreement_date_placeholder"],
  "partnershipName": ["Limited Liability Partnership Agreement.SECTION_I_PARTNERSHIP_DETAILS.subsections.a.partnership_name_placeholder"],
  "formationState": ["Limited Liability Partnership Agreement.SECTION_I_PARTNERSHIP_DETAILS.subsections.a.state_placeholder"],
  "mailingAddress": ["Limited Liability Partnership Agreement.SECTION_I_PARTNERSHIP_DETAILS.subsections.a.mailing_address_placeholder"],
  "businessPurpose": ["Limited Liability Partnership Agreement.SECTION_I_PARTNERSHIP_DETAILS.subsections.b.business_purpose_placeholder"],
  "startDate": ["Limited Liability Partnership Agreement.SECTION_I_PARTNERSHIP_DETAILS.subsections.c.start_date_placeholder"],
  "termType": ["Limited Liability Partnership Agreement.SECTION_I_PARTNERSHIP_DETAILS.subsections.c.term_options"],
  "endDate": ["Limited Liability Partnership Agreement.SECTION_I_PARTNERSHIP_DETAILS.subsections.c.term_options.fixed_term.end_date_placeholder"],

  // Partner Information
  "partnerCount": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners"],
  "partner1Name": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_1.name_placeholder"],
  "partner1Address": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_1.address_placeholder"],
  "partner1Ownership": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_1.details.a.percentage_placeholder"],
  "partner1Capital": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_1.details.b.amount_placeholder"],
  "partner1Signing": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_1.details.c"],
  "partner2Name": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_2.name_placeholder"],
  "partner2Address": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_2.address_placeholder"],
  "partner2Ownership": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_2.details.a.percentage_placeholder"],
  "partner2Capital": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_2.details.b.amount_placeholder"],
  "partner2Signing": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_2.details.c"],
  "partner3Name": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_3.name_placeholder"],
  "partner3Address": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_3.address_placeholder"],
  "partner3Ownership": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_3.details.a.percentage_placeholder"],
  "partner3Capital": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_3.details.b.amount_placeholder"],
  "partner3Signing": ["Limited Liability Partnership Agreement.SECTION_II_THE_PARTNERS.partners.partner_3.details.c"],

  // Voting
  "votingBasis": ["Limited Liability Partnership Agreement.SECTION_III_VOTING.subsections.a.voting_options"],
  "changesVote": ["Limited Liability Partnership Agreement.SECTION_III_VOTING.subsections.b.change_options"],
  "changesVoteOther": ["Limited Liability Partnership Agreement.SECTION_III_VOTING.subsections.b.change_options.other.other_placeholder"],
  "auditVote": ["Limited Liability Partnership Agreement.SECTION_III_VOTING.subsections.c.audit_options"],
  "auditVoteOther": ["Limited Liability Partnership Agreement.SECTION_III_VOTING.subsections.c.audit_options.other.other_placeholder"],

  // Partner Duties
  "expenseResponsibility": ["Limited Liability Partnership Agreement.SECTION_IV_PARTNER_DUTIES.subsections.a.expense_options"],
  "expenseOther": ["Limited Liability Partnership Agreement.SECTION_IV_PARTNER_DUTIES.subsections.a.expense_options.other.other_placeholder"],
  "conflictOfInterest": ["Limited Liability Partnership Agreement.SECTION_IV_PARTNER_DUTIES.subsections.b.conflict_options"],
  "managementStructure": ["Limited Liability Partnership Agreement.SECTION_IV_PARTNER_DUTIES.subsections.c.management_options"],
  "managingPartners": ["Limited Liability Partnership Agreement.SECTION_IV_PARTNER_DUTIES.subsections.c.management_options.specific_partners.partner_names_placeholder"],
  "workRequirements": ["Limited Liability Partnership Agreement.SECTION_IV_PARTNER_DUTIES.subsections.d.work_options"],
  "workingPartners": ["Limited Liability Partnership Agreement.SECTION_IV_PARTNER_DUTIES.subsections.d.work_options.specific_partners.partner_names_placeholder"],
  "withdrawalNotice": ["Limited Liability Partnership Agreement.SECTION_IV_PARTNER_DUTIES.subsections.e.days_notice_placeholder"],

  // Organizational Matters
  "profitDistribution": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.a.profit_options"],
  "customProfitAssignment": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.a.profit_options.custom_percentages.profit_assignment_placeholder"],
  "partnershipRefusalDays": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.b.refusal_subsections.i.partnership_days_placeholder"],
  "partnersRefusalDays": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.b.refusal_subsections.ii.partners_days_placeholder"],
  "meetingType": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.c.meeting_options"],
  "meetingFrequency": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.c.meeting_options.scheduled_meetings.frequency_options"],
  "meetingFrequencyOther": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.c.meeting_options.scheduled_meetings.frequency_options.other.other_frequency_placeholder"],
  "specialMeetingRequest": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.d.special_meeting_options"],
  "specialMeetingPartners": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.d.special_meeting_options.specific_partners.specific_partner_names_placeholder"],
  "specialMeetingOther": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.d.special_meeting_options.other.other_special_meeting_placeholder"],
  "taxYearEnd": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.e.tax_year_date_placeholder"],
  "capitalContributionDeadline": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.f.contribution_deadline_placeholder"],
  "accountingMethod": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.g.accounting_options"],
  "annualReports": ["Limited Liability Partnership Agreement.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.h.report_options"],

  // Legal
  "governingState": ["Limited Liability Partnership Agreement.SECTION_XIII_GOVERNING_LAW.governing_state_placeholder"],
  "additionalTerms": ["Limited Liability Partnership Agreement.SECTION_XVI_ADDITIONAL_TERMS.additional_terms_placeholder"],
};

/**
 * Enhanced highlighting with better section detection
 */
function highlightDocumentSection(fieldId) {
  clearHighlights();

  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;

  const previewElem = document.getElementById("documentPreview");
  paths.forEach(path => {
    // Find exact path matches first
    let elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);

    if (elements.length === 0) {
      // Try finding section containers
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

  // Scroll to first highlighted element
  setTimeout(() => {
    const firstHighlighted = document.querySelector(".highlighted, .highlighted-section");
    if (firstHighlighted) {
      firstHighlighted.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 1);
}

/**
 * Clear all highlighting
 */
function clearHighlights() {
  const previewElem = document.getElementById("documentPreview");
  const highlightedElements = previewElem.querySelectorAll(".highlighted, .highlighted-section");
  highlightedElements.forEach(element => {
    element.classList.remove("highlighted");
    element.classList.remove("highlighted-section");
  });
}

// Store form data between steps
let formDataStore = {};

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Limited Liability Partnership Agreement": {} };
  }

  try {
    initializeDocumentTemplate();
    showQuestionnaire();
    updatePreview();
    setTimeout(registerHighlightEvents, 500);

    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    console.log("Document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

/**
 * Enhanced document to HTML conversion for LLP Agreement
 */
function convertToHtml(document) {
  let html = [];
  
  if (!document || typeof document !== 'object') {
    console.error('Invalid document structure');
    return '<div class="error">Invalid document structure</div>';
  }
  
  const documentTitle = Object.keys(document)[0];

  if (documentTitle && document[documentTitle]) {
    const mainContent = document[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        try {
          processSection(section, mainContent[section], 0, documentTitle);
        } catch (error) {
          console.error(`Error processing section ${section}:`, error);
          html.push(`<div class="error">Error processing section: ${section}</div>`);
        }
      }
    });
  } else {
    console.error('No document title found or empty document');
    return '<div class="error">No document content found</div>';
  }
  
  return html.join("");

  function processSection(key, value, level, path) {
    const currentPath = path ? `${path}.${key}` : key;

    if (key === "DOCUMENT_TITLE") {
      html.push(`
        <div class="document-title" data-path="${currentPath}" style="text-align: center; font-weight: bold; font-size: 20px; margin-bottom: 30px;">
          <span data-value-path="${currentPath}.title">${value.title}</span>
        </div>
      `);
    } else if (key.startsWith("SECTION_")) {
      processLegalSection(key, value, currentPath);
    } else if (key === "SIGNATURE_SECTION") {
      generateSignatureSection(currentPath, value, formDataStore);
    }
  }

  function processLegalSection(key, value, currentPath) {
    // Section header
    html.push(`
      <div class="legal-section" data-path="${currentPath}" style="margin: 30px 0;">
        <div style="margin-bottom: 20px;">
          <strong>${value.section_number} ${value.section_title}</strong>
        </div>
    `);

    // Section content based on type
    if (key === "SECTION_I_PARTNERSHIP_DETAILS") {
      generatePartnershipDetails(currentPath, value, formDataStore);
    } else if (key === "SECTION_II_THE_PARTNERS") {
      generatePartnersSection(currentPath, value, formDataStore);
    } else if (key === "SECTION_III_VOTING") {
      generateVotingSection(currentPath, value, formDataStore);
    } else if (key === "SECTION_IV_PARTNER_DUTIES") {
      generatePartnerDutiesSection(currentPath, value, formDataStore);
    } else if (key === "SECTION_V_ORGANIZATIONAL_MATTERS") {
      generateOrganizationalSection(currentPath, value, formDataStore);
    } else if (key === "SECTION_VI_INVOLUNTARY_WITHDRAWAL") {
      generateInvoluntaryWithdrawalSection(currentPath, value);
    } else {
      // Simple sections with just content
      if (value.content) {
        html.push(`
          <div style="margin-left: 20px;">
            <span data-value-path="${currentPath}.content">${value.content}</span>
          </div>
        `);
      }
    }

    html.push(`</div>`);
  }

  function generatePartnershipDetails(currentPath, value, formData) {
    html.push(`
      <div style="margin-left: 20px;">
        <p>
          ${value.intro_text} 
          <span data-value-path="${currentPath}.agreement_date_placeholder">
            ${formatDate(formData.agreementDate) || value.agreement_date_placeholder}
          </span> 
          ${value.effective_date_text}
        </p>
        <div style="margin: 20px 0;">
          <p><strong>a. ${value.subsections?.a?.label || 'Entity Name'}:</strong> 
            <span data-value-path="${currentPath}.subsections.a.partnership_name_placeholder">
              ${formData.partnershipName || value.subsections?.a?.partnership_name_placeholder || '[NAME OF PARTNERSHIP]'}
            </span> 
            ${value.subsections?.a?.formed_text || 'formed in the State of'} 
            <span data-value-path="${currentPath}.subsections.a.state_placeholder">
              ${formData.formationState || value.subsections?.a?.state_placeholder || '[STATE]'}
            </span> 
            ${value.subsections?.a?.business_location_text || 'with a principal place of business at'} 
            <span data-value-path="${currentPath}.subsections.a.mailing_address_placeholder">
              ${formData.mailingAddress || value.subsections?.a?.mailing_address_placeholder || '[MAILING ADDRESS]'}
            </span> 
            ${value.subsections?.a?.partnership_description || '(Partnership).'}
          </p>
        </div>
        <div style="margin: 20px 0;">
          <p><strong>b. ${value.subsections?.b?.label || 'Business Purpose'}:</strong> 
            ${value.subsections?.b?.intro_text || 'The Partnership\'s primary business purpose is:'} 
            <span data-value-path="${currentPath}.subsections.b.business_purpose_placeholder">
              ${formData.businessPurpose || value.subsections?.b?.business_purpose_placeholder || '[ENTER THE BUSINESS PURPOSE]'}
            </span>.
          </p>
        </div>
        <div style="margin: 20px 0;">
          <p><strong>c. ${value.subsections?.c?.label || 'Term'}:</strong> 
            ${value.subsections?.c?.intro_text || 'This Agreement has an effective start date of'} 
            <span data-value-path="${currentPath}.subsections.c.start_date_placeholder">
              ${formatDate(formData.startDate) || value.subsections?.c?.start_date_placeholder || '[START DATE]'}
            </span> 
            ${value.subsections?.c?.continuation_text || 'and shall continue:'}
          </p>
          ${generateTermOptions(currentPath, value.subsections?.c, formData)}
        </div>
      </div>
    `);
  }

  function generateTermOptions(parentPath, termSection, formData) {
    const selected = formData.termType;
    let optionsHtml = `<div style="margin: 15px 0 15px 40px;">`;
    
    Object.entries(termSection.term_options).forEach(([optionKey, option]) => {
      const isSelected = selected === option.label;
      const checkbox = isSelected ? "☑" : "☐";
      
      optionsHtml += `<p>${checkbox} - <strong>${option.label}</strong>. `;
      
      if (optionKey === "fixed_term" && option.description_start) {
        optionsHtml += `${option.description_start} `;
        optionsHtml += `<span data-value-path="${parentPath}.subsections.c.term_options.fixed_term.end_date_placeholder">`;
        optionsHtml += `${formatDate(formData.endDate) || option.end_date_placeholder}`;
        optionsHtml += `</span> ${option.description_end}`;
      } else {
        optionsHtml += option.description;
      }
      optionsHtml += `</p>`;
    });
    
    optionsHtml += `</div>`;
    return optionsHtml;
  }

  function generatePartnersSection(currentPath, value, formData) {
    const partnerCount = parseInt(formData.partnerCount) || 1;
    
    html.push(`
      <div style="margin-left: 20px;">
        <p>${value.intro_text}</p>
    `);

    for (let i = 1; i <= partnerCount; i++) {
      const partnerKey = `partner_${i}`;
      const partner = value.partners[partnerKey];
      if (!partner) continue;

      const partnerData = {
        name: formData[`partner${i}Name`] || partner.name_placeholder,
        address: formData[`partner${i}Address`] || partner.address_placeholder,
        ownership: formData[`partner${i}Ownership`] || partner.details.a.percentage_placeholder,
        capital: formData[`partner${i}Capital`] || partner.details.b.amount_placeholder,
        signing: formData[`partner${i}Signing`] || "No"
      };

      html.push(`
        <div style="margin: 20px 0;">
          <p><strong>${partner.partner_label}</strong> 
            <span data-value-path="${currentPath}.partners.${partnerKey}.name_placeholder">${partnerData.name}</span> 
            ${partner.address_intro} 
            <span data-value-path="${currentPath}.partners.${partnerKey}.address_placeholder">${partnerData.address}</span>.
          </p>
          <div style="margin-left: 20px;">
            <p>a. <strong>${partner.details.a.label}:</strong> 
              <span data-value-path="${currentPath}.partners.${partnerKey}.details.a.percentage_placeholder">${partnerData.ownership}%</span>
            </p>
            <p>b. <strong>${partner.details.b.label}:</strong> 
              <span data-value-path="${currentPath}.partners.${partnerKey}.details.b.amount_placeholder">$${partnerData.capital}</span>
            </p>
            <p>c. <strong>${partner.details.c.label}:</strong> ${partner.details.c.question} 
              ${partnerData.signing === "Yes" ? "☑ Yes ☐ No" : "☐ Yes ☑ No"}
            </p>
          </div>
        </div>
      `);
    }

    html.push(`
        <p style="margin-top: 20px;">${value.closing_text}</p>
      </div>
    `);
  }

  function generateVotingSection(currentPath, value, formData) {
    html.push(`
      <div style="margin-left: 20px;">
        <p>${value.intro_text}</p>
    `);

    // Generate each subsection
    Object.entries(value.subsections).forEach(([subKey, subsection]) => {
      html.push(`
        <div style="margin: 20px 0;">
          <p><strong>${subKey}. ${subsection.label}.</strong> ${subsection.intro_text}</p>
          <div style="margin-left: 40px;">
            ${generateOptionsForSubsection(currentPath, subKey, subsection, formData)}
          </div>
          ${subsection.changes_explanation ? `<p style="margin-top: 10px;">${subsection.changes_explanation}</p>` : ''}
        </div>
      `);
    });

    html.push(`</div>`);
  }

  function generateOptionsForSubsection(parentPath, subKey, subsection, formData) {
    let optionsHtml = '';
    const optionsKey = Object.keys(subsection).find(key => key.includes('_options'));
    if (!optionsKey) return '';

    const options = subsection[optionsKey];
    const fieldMapping = {
      'a': 'votingBasis',
      'b': 'changesVote', 
      'c': 'auditVote'
    };
    
    const selectedValue = formData[fieldMapping[subKey]];

    Object.entries(options).forEach(([optionKey, option]) => {
      const isSelected = selectedValue === option.label;
      const checkbox = isSelected ? "☑" : "☐";
      
      optionsHtml += `<p>${checkbox} - <strong>${option.label}</strong>. ${option.description}`;
      
      if (optionKey === 'other' && option.other_placeholder && isSelected) {
        const otherValue = formData[`${fieldMapping[subKey]}Other`];
        optionsHtml += ` <span data-value-path="${parentPath}.subsections.${subKey}.${optionsKey}.other.other_placeholder">`;
        optionsHtml += `${otherValue || option.other_placeholder}`;
        optionsHtml += `</span>`;
      }
      
      optionsHtml += `</p>`;
    });

    return optionsHtml;
  }

  function generatePartnerDutiesSection(currentPath, value, formData) {
    html.push(`
      <div style="margin-left: 20px;">
        <p>${value.intro_text}</p>
    `);

    // Process each subsection with specific handling
    Object.entries(value.subsections).forEach(([subKey, subsection]) => {
      if (subKey === 'e') {
        // Special handling for withdrawal notice
        html.push(`
          <div style="margin: 20px 0;">
            <p><strong>${subKey}. ${subsection.label}.</strong> 
              ${subsection.intro_text} 
              <span data-value-path="${currentPath}.subsections.${subKey}.days_notice_placeholder">
                ${formData.withdrawalNotice || subsection.days_notice_placeholder}
              </span> 
              ${subsection.withdrawal_text}
            </p>
          </div>
        `);
      } else {
        // Standard option handling
        html.push(`
          <div style="margin: 20px 0;">
            <p><strong>${subKey}. ${subsection.label}.</strong> ${subsection.intro_text}</p>
            <div style="margin-left: 40px;">
              ${generateDutyOptions(currentPath, subKey, subsection, formData)}
            </div>
          </div>
        `);
      }
    });

    html.push(`</div>`);
  }

  function generateDutyOptions(parentPath, subKey, subsection, formData) {
    let optionsHtml = '';
    const optionsKey = Object.keys(subsection).find(key => key.includes('_options'));
    if (!optionsKey) return '';

    const options = subsection[optionsKey];
    const fieldMapping = {
      'a': 'expenseResponsibility',
      'b': 'conflictOfInterest',
      'c': 'managementStructure',
      'd': 'workRequirements'
    };
    
    const selectedValue = formData[fieldMapping[subKey]];

    Object.entries(options).forEach(([optionKey, option]) => {
      const isSelected = selectedValue === option.label;
      const checkbox = isSelected ? "☑" : "☐";
      
      optionsHtml += `<p>${checkbox} - <strong>${option.label}</strong>`;
      
      if (option.description) {
        optionsHtml += `. ${option.description}`;
      } else if (option.description_start) {
        optionsHtml += `. ${option.description_start}`;
        if (option.partner_names_placeholder && isSelected) {
          const partnerValue = formData[`${fieldMapping[subKey] === 'managementStructure' ? 'managing' : 'working'}Partners`];
          optionsHtml += ` <span data-value-path="${parentPath}.subsections.${subKey}.${optionsKey}.${optionKey}.partner_names_placeholder">`;
          optionsHtml += `${partnerValue || option.partner_names_placeholder}`;
          optionsHtml += `</span>`;
        }
        if (option.compensation_note) {
          optionsHtml += `. ${option.compensation_note}`;
        }
      }
      
      if (optionKey === 'other' && option.other_placeholder && isSelected) {
        const otherValue = formData[`${fieldMapping[subKey]}Other`];
        optionsHtml += ` <span data-value-path="${parentPath}.subsections.${subKey}.${optionsKey}.other.other_placeholder">`;
        optionsHtml += `${otherValue || option.other_placeholder}`;
        optionsHtml += `</span>`;
      }
      
      optionsHtml += `</p>`;
    });

    return optionsHtml;
  }

  function generateOrganizationalSection(currentPath, value, formData) {
    html.push(`
      <div style="margin-left: 20px;">
        <p>${value.intro_text}</p>
    `);

    Object.entries(value.subsections).forEach(([subKey, subsection]) => {
      html.push(`
        <div style="margin: 20px 0;">
          <p><strong>${subKey}. ${subsection.label}.</strong>
      `);

      if (subsection.intro_text) {
        if (subKey === 'e' || subKey === 'f') {
          // Date fields
          const fieldName = subKey === 'e' ? 'taxYearEnd' : 'capitalContributionDeadline';
          const placeholder = subKey === 'e' ? subsection.tax_year_date_placeholder : subsection.contribution_deadline_placeholder;
          html.push(`
            ${subsection.intro_text} 
            <span data-value-path="${currentPath}.subsections.${subKey}.${subKey === 'e' ? 'tax_year_date_placeholder' : 'contribution_deadline_placeholder'}">
              ${formatDate(formData[fieldName]) || placeholder}
            </span>.
          `);
        } else {
          html.push(subsection.intro_text);
        }
      }

      if (subsection.profit_options || subsection.meeting_options || subsection.special_meeting_options || subsection.accounting_options || subsection.report_options) {
        html.push(`</p><div style="margin-left: 40px;">`);
        html.push(generateOrganizationalOptions(currentPath, subKey, subsection, formData));
        html.push(`</div>`);
      } else if (subsection.refusal_subsections) {
        html.push(`</p>`);
        Object.entries(subsection.refusal_subsections).forEach(([refusalKey, refusalSub]) => {
          const fieldName = refusalKey === 'i' ? 'partnershipRefusalDays' : 'partnersRefusalDays';
          const placeholder = refusalKey === 'i' ? refusalSub.partnership_days_placeholder : refusalSub.partners_days_placeholder;
          
          html.push(`
            <div style="margin-left: 40px;">
              <p><strong>${refusalKey}. ${refusalSub.label}.</strong> 
                ${refusalSub.intro_text} 
                <span data-value-path="${currentPath}.subsections.${subKey}.refusal_subsections.${refusalKey}.${refusalKey === 'i' ? 'partnership_days_placeholder' : 'partners_days_placeholder'}">
                  ${formData[fieldName] || placeholder}
                </span> 
                ${refusalKey === 'i' ? refusalSub.partnership_notice_text : refusalSub.partners_notice_text}
              </p>
            </div>
          `);
        });
      } else {
        html.push(`</p>`);
      }

      if (subsection.responsibility_note) {
        html.push(`<p style="margin-top: 10px;">${subsection.responsibility_note}</p>`);
      }

      html.push(`</div>`);
    });

    html.push(`</div>`);
  }

  function generateOrganizationalOptions(parentPath, subKey, subsection, formData) {
    let optionsHtml = '';
    
    const fieldMapping = {
      'a': 'profitDistribution',
      'c': 'meetingType',
      'd': 'specialMeetingRequest',
      'g': 'accountingMethod',
      'h': 'annualReports'
    };

    if (subsection.profit_options) {
      const selected = formData.profitDistribution;
      Object.entries(subsection.profit_options).forEach(([optionKey, option]) => {
        const isSelected = selected === option.label;
        const checkbox = isSelected ? "☑" : "☐";
        
        optionsHtml += `<p>${checkbox} - <strong>${option.label}</strong>. `;
        if (option.description) {
          optionsHtml += option.description;
        } else if (option.description_start) {
          optionsHtml += `${option.description_start} `;
          if (option.profit_assignment_placeholder && isSelected) {
            optionsHtml += `<span data-value-path="${parentPath}.subsections.${subKey}.profit_options.${optionKey}.profit_assignment_placeholder">`;
            optionsHtml += `${formData.customProfitAssignment || option.profit_assignment_placeholder}`;
            optionsHtml += `</span>`;
          }
        }
        optionsHtml += `</p>`;
      });
    }

    if (subsection.meeting_options) {
      const selected = formData.meetingType;
      Object.entries(subsection.meeting_options).forEach(([optionKey, option]) => {
        const isSelected = selected === option.label;
        const checkbox = isSelected ? "☑" : "☐";
        
        optionsHtml += `<p>${checkbox} - <strong>${option.label}</strong>. `;
        if (option.description) {
          optionsHtml += option.description;
        } else if (option.frequency_options && isSelected) {
          optionsHtml += `${option.description}</p>`;
          optionsHtml += `<div style="margin-left: 20px;">`;
          
          const selectedFreq = formData.meetingFrequency;
          Object.entries(option.frequency_options).forEach(([freqKey, freqOption]) => {
            const isFreqSelected = selectedFreq === freqOption.label;
            const freqCheckbox = isFreqSelected ? "☑" : "☐";
            
            optionsHtml += `<p>${freqCheckbox} - ${freqOption.label}`;
            if (freqKey === 'other' && freqOption.other_frequency_placeholder && isFreqSelected) {
              optionsHtml += `. <span data-value-path="${parentPath}.subsections.${subKey}.meeting_options.${optionKey}.frequency_options.other.other_frequency_placeholder">`;
              optionsHtml += `${formData.meetingFrequencyOther || freqOption.other_frequency_placeholder}`;
              optionsHtml += `</span>`;
            }
            optionsHtml += `</p>`;
          });
          
          optionsHtml += `</div><p style="margin: 0;">`;
        }
        optionsHtml += `</p>`;
      });
    }

    if (subsection.special_meeting_options) {
      const selected = formData.specialMeetingRequest;
      Object.entries(subsection.special_meeting_options).forEach(([optionKey, option]) => {
        const isSelected = selected === option.label;
        const checkbox = isSelected ? "☑" : "☐";
        
        optionsHtml += `<p>${checkbox} - <strong>${option.label}</strong>. `;
        if (option.description) {
          optionsHtml += option.description;
        } else if (option.description_start) {
          optionsHtml += `${option.description_start} `;
          if (option.specific_partner_names_placeholder && isSelected) {
            optionsHtml += `<span data-value-path="${parentPath}.subsections.${subKey}.special_meeting_options.${optionKey}.specific_partner_names_placeholder">`;
            optionsHtml += `${formData.specialMeetingPartners || option.specific_partner_names_placeholder}`;
            optionsHtml += `</span>`;
          } else if (option.other_special_meeting_placeholder && isSelected) {
            optionsHtml += `<span data-value-path="${parentPath}.subsections.${subKey}.special_meeting_options.${optionKey}.other_special_meeting_placeholder">`;
            optionsHtml += `${formData.specialMeetingOther || option.other_special_meeting_placeholder}`;
            optionsHtml += `</span>`;
          }
        }
        optionsHtml += `</p>`;
      });
    }

    if (subsection.accounting_options) {
      const selected = formData.accountingMethod;
      Object.entries(subsection.accounting_options).forEach(([optionKey, option]) => {
        const isSelected = selected === option.label;
        const checkbox = isSelected ? "☑" : "☐";
        optionsHtml += `<p>${checkbox} - <strong>${option.label}</strong></p>`;
      });
    }

    if (subsection.report_options) {
      const selectedReports = formData.annualReports || [];
      Object.entries(subsection.report_options).forEach(([optionKey, option]) => {
        const isSelected = selectedReports.includes(option.label);
        const checkbox = isSelected ? "☑" : "☐";
        optionsHtml += `<p>${checkbox} - <strong>${option.label}</strong></p>`;
      });
    }

    return optionsHtml;
  }

  function generateInvoluntaryWithdrawalSection(currentPath, value) {
    html.push(`
      <div style="margin-left: 20px;">
        <p>${value.intro_text}</p>
        <div style="margin: 20px 0;">
    `);

    Object.entries(value.withdrawal_circumstances).forEach(([key, circumstance]) => {
      html.push(`<p style="margin-left: 20px;">${key}. ${circumstance}</p>`);
    });

    html.push(`
        </div>
        <p>${value.approval_process}</p>
        <p style="margin-top: 15px;">${value.valuation_process}</p>
      </div>
    `);
  }

  function generateSignatureSection(currentPath, value, formData) {
    const partnerCount = parseInt(formData.partnerCount) || 1;
    
    html.push(`
      <div class="signature-section" data-path="${currentPath}" style="margin: 40px 0;">
        <p style="text-align: center; margin-bottom: 30px;">
          <span data-value-path="${currentPath}.witness_clause">${value.witness_clause}</span>
        </p>
        <div style="margin-top: 40px;">
    `);

    for (let i = 1; i <= partnerCount; i++) {
      const partnerKey = `partner_${i}`;
      const partner = value.partner_signatures[partnerKey];
      if (!partner) continue;

      const partnerName = formData[`partner${i}Name`] || `Partner ${i}`;

      html.push(`
        <div style="margin-bottom: 40px;">
          <p><strong>${partner.signature_label}</strong></p>
          <p style="margin: 10px 0;">
            <span data-value-path="${currentPath}.partner_signatures.${partnerKey}.signature_line">${partner.signature_line}</span>
          </p>
          <p>
            ${partner.date_label} 
            <span data-value-path="${currentPath}.partner_signatures.${partnerKey}.date_line">${partner.date_line}</span>
          </p>
          <p>
            ${partner.print_name_label} 
            <span data-value-path="${currentPath}.partner_signatures.${partnerKey}.print_name_line">${partnerName}</span>
          </p>
        </div>
      `);
    }

    html.push(`
        </div>
      </div>
    `);
  }
}

function showQuestionnaire() {
  const container = document.getElementById("keyContainer");
  container.innerHTML = "";

  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= 6; stepNumber++) {
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

  container.innerHTML = allQuestionsHTML + `
    <div class="validation-section" style="margin-top: 30px; text-align: center;">
      <button id="validateFormBtn" class="btn btn-primary" style="padding: 12px 24px; font-size: 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Validate Form
      </button>
      <p style="margin-top: 10px; font-size: 14px; color: #666;">
        Click to check if all required fields are completed and ownership percentages add up to 100%
      </p>
    </div>
  `;

  // Add event handlers
  document
    .querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea")
    .forEach((input) => {
      input.addEventListener("input", function () {
        formDataStore[this.id] = this.value;

        if (this.id === "partnerCount") {
          handlePartnerCountChange(this);
        } else if (this.id === "termType") {
          handleTermTypeChange(this);
        } else if (this.id === "meetingType") {
          handleMeetingTypeChange(this);
        } else if (this.type === "checkbox") {
          handleCheckboxChange(this);
        } else {
          // Clear validation errors when user starts typing
          if (this.value && this.value.trim() !== '') {
            clearValidationErrors();
          }
          
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Add validate button event listener
  document.getElementById('validateFormBtn').addEventListener('click', function() {
    const validation = validateForm();
    if (validation.isValid) {
      clearValidationErrors();
      showNotification('✅ Form validation passed! All required fields are completed.');
    } else {
      showValidationErrors(validation.errors);
    }
  });

  // Restore saved form data
  for (let step = 1; step <= 6; step++) {
    restoreStepData(step);
  }
  registerHighlightEvents();
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

function createQuestionsHTML(stepData) {
  let html = "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      html += `<div class="question-group" id="${key}-group">`;
      html += createQuestionsHTML(data);
      html += "</div>";
    } else {
      html += createQuestionField(key, data);
    }
  }
  return html;
}

function createQuestionField(key, data, sectionClass = "") {
  if (!data.question) return "";

  let visibilityAttr = "";
  if (data.showIf) {
    visibilityAttr = `data-show-if="${data.showIf}" data-min-partners="${data.minPartners || 1}" style="display: none;"`;
  }

  const affectedPaths = documentPathMap[key] ?
      `data-affects-path="${documentPathMap[key].join(',')}"` : "";
  
  const requiredAttr = data.required ? 'required' : '';

  return `
    <div class="question-field ${sectionClass}" ${visibilityAttr}>
      <label>${data.question} ${data.required ? '<span style="color: red;">*</span>' : ''}</label>
      ${createInputElement(key, data, affectedPaths, requiredAttr)}
    </div>
  `;
}

function createInputElement(key, data, affectedPaths, requiredAttr) {
  // Special handlers
  if (key === "partnerCount") {
    return `
      <select id="${key}" onchange="handlePartnerCountChange(this)" ${affectedPaths} ${requiredAttr}>
        <option value="">Select...</option>
        ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
      </select>
    `;
  }

  if (key === "termType") {
    return `
      <select id="${key}" onchange="handleTermTypeChange(this)" ${affectedPaths} ${requiredAttr}>
        <option value="">Select...</option>
        ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
      </select>
    `;
  }

  if (key === "meetingType") {
    return `
      <select id="${key}" onchange="handleMeetingTypeChange(this)" ${affectedPaths} ${requiredAttr}>
        <option value="">Select...</option>
        ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
      </select>
    `;
  }

  if (data.type === "checkbox") {
    return `
      <div class="checkbox-group">
        ${data.options.map((opt) => `
          <label class="checkbox-label">
            <input type="checkbox" id="${key}_${opt.replace(/\s+/g, '_')}" value="${opt}" onchange="handleCheckboxChange(this)" ${affectedPaths}>
            ${opt}
          </label>
        `).join("")}
      </div>
    `;
  }

  // Standard input types
  switch (data.type) {
    case "textarea":
      const rows = data.rows || 3;
      return `<textarea id="${key}" class="form-textarea" placeholder="${data.placeholder || ''}" rows="${rows}" ${affectedPaths} ${requiredAttr}></textarea>`;
    case "date":
      return `<input type="date" id="${key}" ${affectedPaths} ${requiredAttr}>`;
    case "number":
      const min = data.min !== undefined ? `min="${data.min}"` : '';
      const max = data.max !== undefined ? `max="${data.max}"` : '';
      return `<input type="number" id="${key}" placeholder="${data.placeholder || ''}" ${min} ${max} ${affectedPaths} ${requiredAttr}>`;
    case "select":
      return `
        <select id="${key}" ${affectedPaths} ${requiredAttr}>
          <option value="">Select...</option>
          ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
        </select>
      `;
    default:
      return `<input type="text" id="${key}" placeholder="${data.placeholder || ''}" ${affectedPaths} ${requiredAttr}>`;
  }
}

function handlePartnerCountChange(selectElement) {
  const selectedCount = parseInt(selectElement.value) || 0;
  formDataStore[selectElement.id] = selectElement.value;

  // Show/hide partner fields based on count
  document.querySelectorAll('[data-show-if="partnerCount"]').forEach(field => {
    const minPartners = parseInt(field.getAttribute('data-min-partners')) || 1;
    const shouldShow = selectedCount >= minPartners;
    field.style.display = shouldShow ? "block" : "none";
  });

  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);

  // Focus first visible partner field
  setTimeout(() => {
    const firstVisibleField = document.querySelector('[data-show-if="partnerCount"][style*="block"] input, [data-show-if="partnerCount"][style*="block"] textarea');
    if (firstVisibleField && !firstVisibleField.value) {
      firstVisibleField.focus();
    }
  }, 200);
}

function handleTermTypeChange(selectElement) {
  formDataStore[selectElement.id] = selectElement.value;
  
  // Show/hide end date field
  const endDateField = document.querySelector('[data-show-if="termType=Fixed Term"]');
  if (endDateField) {
    endDateField.style.display = selectElement.value === "Fixed Term" ? "block" : "none";
  }

  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);
}

function handleMeetingTypeChange(selectElement) {
  formDataStore[selectElement.id] = selectElement.value;
  
  // Show/hide meeting frequency fields
  const frequencyField = document.querySelector('[data-show-if="meetingType=Scheduled meetings"]');
  if (frequencyField) {
    frequencyField.style.display = selectElement.value === "Scheduled meetings" ? "block" : "none";
  }

  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);
}

function handleCheckboxChange(checkbox) {
  const fieldName = checkbox.id.split('_')[0];
  
  // Get all checkboxes for this field
  const checkboxes = document.querySelectorAll(`input[type="checkbox"][id^="${fieldName}_"]`);
  const selectedValues = [];
  
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selectedValues.push(cb.value);
    }
  });
  
  formDataStore[fieldName] = selectedValues;
  
  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(fieldName);
}

function restoreStepData(stepNumber) {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      if (input.type === "checkbox") {
        const fieldName = input.id.split('_')[0];
        const savedValues = formDataStore[fieldName] || [];
        input.checked = savedValues.includes(input.value);
      } else {
        input.value = formDataStore[input.id];

        if (input.tagName === "SELECT") {
          if (input.id === "partnerCount") {
            handlePartnerCountChange(input);
          } else if (input.id === "termType") {
            handleTermTypeChange(input);
          } else if (input.id === "meetingType") {
            handleMeetingTypeChange(input);
          }
        }
      }
    }
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
}

function validateForm() {
  const requiredFields = [
    'agreementDate', 'partnershipName', 'formationState', 'mailingAddress', 
    'businessPurpose', 'startDate', 'termType', 'partnerCount',
    'partner1Name', 'partner1Address', 'partner1Ownership', 'partner1Capital', 'partner1Signing',
    'votingBasis', 'changesVote', 'auditVote', 'expenseResponsibility', 'conflictOfInterest',
    'managementStructure', 'workRequirements', 'withdrawalNotice', 'profitDistribution',
    'partnershipRefusalDays', 'partnersRefusalDays', 'meetingType', 'specialMeetingRequest',
    'taxYearEnd', 'capitalContributionDeadline', 'accountingMethod', 'annualReports',
    'governingState'
  ];

  const errors = [];
  
  // Basic required fields
  requiredFields.forEach(fieldId => {
    const value = formDataStore[fieldId];
    if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')) {
      const fieldElement = document.getElementById(fieldId);
      if (fieldElement) {
        const label = fieldElement.previousElementSibling;
        const fieldName = label ? label.textContent.replace('*', '').trim() : fieldId;
        errors.push(fieldName);
      }
    }
  });

  // Partner-specific validation
  const partnerCount = parseInt(formDataStore.partnerCount) || 0;
  for (let i = 2; i <= partnerCount; i++) {
    const requiredPartnerFields = [`partner${i}Name`, `partner${i}Address`, `partner${i}Ownership`, `partner${i}Capital`, `partner${i}Signing`];
    requiredPartnerFields.forEach(fieldId => {
      const value = formDataStore[fieldId];
      if (!value || value.trim() === '') {
        errors.push(`Partner ${i} - ${fieldId.replace(`partner${i}`, '').replace(/([A-Z])/g, ' $1').trim()}`);
      }
    });
  }

  // Ownership percentage validation
  let totalOwnership = 0;
  for (let i = 1; i <= partnerCount; i++) {
    const ownership = parseFloat(formDataStore[`partner${i}Ownership`]) || 0;
    totalOwnership += ownership;
  }
  
  if (Math.abs(totalOwnership - 100) > 0.01) {
    errors.push(`Total ownership percentages must equal 100% (currently ${totalOwnership}%)`);
  }

  // Fixed term end date validation
  if (formDataStore.termType === "Fixed Term" && !formDataStore.endDate) {
    errors.push("End date is required for fixed-term agreements");
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

function showValidationErrors(errors) {
  const errorDiv = document.getElementById('validation-errors') || document.createElement('div');
  errorDiv.id = 'validation-errors';
  errorDiv.style.cssText = `
    background-color: #ffebee;
    border: 1px solid #f44336;
    color: #c62828;
    padding: 15px;
    margin: 20px 0;
    border-radius: 4px;
  `;
  
  errorDiv.innerHTML = `
    <h4 style="margin: 0 0 10px 0; color: #c62828;">Please fix the following issues:</h4>
    <ul style="margin: 0; padding-left: 20px;">
      ${errors.map(error => `<li>${error}</li>`).join('')}
    </ul>
  `;
  
  const container = document.getElementById("keyContainer");
  container.insertBefore(errorDiv, container.firstChild);
  
  // Scroll to top
  errorDiv.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearValidationErrors() {
  const errorDiv = document.getElementById('validation-errors');
  if (errorDiv) {
    errorDiv.remove();
  }
}

/**
 * Enhanced form data to document mapping for LLP Agreement
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Limited Liability Partnership Agreement";

  // Basic partnership information
  if (formData.agreementDate) {
    const dateKey = `${documentTitle}.SECTION_I_PARTNERSHIP_DETAILS.agreement_date_placeholder`;
    updatedFlatDoc[dateKey] = formatDate(formData.agreementDate);
  }

  if (formData.partnershipName) {
    const nameKey = `${documentTitle}.SECTION_I_PARTNERSHIP_DETAILS.subsections.a.partnership_name_placeholder`;
    updatedFlatDoc[nameKey] = formData.partnershipName;
  }

  if (formData.formationState) {
    const stateKey = `${documentTitle}.SECTION_I_PARTNERSHIP_DETAILS.subsections.a.state_placeholder`;
    updatedFlatDoc[stateKey] = formData.formationState;
  }

  if (formData.mailingAddress) {
    const addressKey = `${documentTitle}.SECTION_I_PARTNERSHIP_DETAILS.subsections.a.mailing_address_placeholder`;
    updatedFlatDoc[addressKey] = formData.mailingAddress;
  }

  if (formData.businessPurpose) {
    const purposeKey = `${documentTitle}.SECTION_I_PARTNERSHIP_DETAILS.subsections.b.business_purpose_placeholder`;
    updatedFlatDoc[purposeKey] = formData.businessPurpose;
  }

  if (formData.startDate) {
    const startKey = `${documentTitle}.SECTION_I_PARTNERSHIP_DETAILS.subsections.c.start_date_placeholder`;
    updatedFlatDoc[startKey] = formatDate(formData.startDate);
  }

  if (formData.endDate && formData.termType === "Fixed Term") {
    const endKey = `${documentTitle}.SECTION_I_PARTNERSHIP_DETAILS.subsections.c.term_options.fixed_term.end_date_placeholder`;
    updatedFlatDoc[endKey] = formatDate(formData.endDate);
  }

  // Partner information
  const partnerCount = parseInt(formData.partnerCount) || 1;
  for (let i = 1; i <= partnerCount; i++) {
    const partnerData = {
      name: formData[`partner${i}Name`],
      address: formData[`partner${i}Address`],
      ownership: formData[`partner${i}Ownership`],
      capital: formData[`partner${i}Capital`],
      signing: formData[`partner${i}Signing`]
    };

    if (partnerData.name) {
      const nameKey = `${documentTitle}.SECTION_II_THE_PARTNERS.partners.partner_${i}.name_placeholder`;
      updatedFlatDoc[nameKey] = partnerData.name;
      
      // Also update signature section
      const signatureNameKey = `${documentTitle}.SIGNATURE_SECTION.partner_signatures.partner_${i}.print_name_line`;
      updatedFlatDoc[signatureNameKey] = partnerData.name;
    }

    if (partnerData.address) {
      const addressKey = `${documentTitle}.SECTION_II_THE_PARTNERS.partners.partner_${i}.address_placeholder`;
      updatedFlatDoc[addressKey] = partnerData.address;
    }

    if (partnerData.ownership) {
      const ownershipKey = `${documentTitle}.SECTION_II_THE_PARTNERS.partners.partner_${i}.details.a.percentage_placeholder`;
      updatedFlatDoc[ownershipKey] = `${partnerData.ownership}%`;
    }

    if (partnerData.capital) {
      const capitalKey = `${documentTitle}.SECTION_II_THE_PARTNERS.partners.partner_${i}.details.b.amount_placeholder`;
      updatedFlatDoc[capitalKey] = `$${partnerData.capital}`;
    }
  }

  // Legal sections
  if (formData.governingState) {
    const govKey = `${documentTitle}.SECTION_XIII_GOVERNING_LAW.governing_state_placeholder`;
    updatedFlatDoc[govKey] = formData.governingState;
  }

  if (formData.additionalTerms) {
    const addKey = `${documentTitle}.SECTION_XVI_ADDITIONAL_TERMS.additional_terms_placeholder`;
    updatedFlatDoc[addKey] = formData.additionalTerms;
  }

  // Other dynamic fields
  if (formData.withdrawalNotice) {
    const withdrawalKey = `${documentTitle}.SECTION_IV_PARTNER_DUTIES.subsections.e.days_notice_placeholder`;
    updatedFlatDoc[withdrawalKey] = formData.withdrawalNotice;
  }

  if (formData.customProfitAssignment) {
    const profitKey = `${documentTitle}.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.a.profit_options.custom_percentages.profit_assignment_placeholder`;
    updatedFlatDoc[profitKey] = formData.customProfitAssignment;
  }

  if (formData.partnershipRefusalDays) {
    const partnershipRefusalKey = `${documentTitle}.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.b.refusal_subsections.i.partnership_days_placeholder`;
    updatedFlatDoc[partnershipRefusalKey] = formData.partnershipRefusalDays;
  }

  if (formData.partnersRefusalDays) {
    const partnersRefusalKey = `${documentTitle}.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.b.refusal_subsections.ii.partners_days_placeholder`;
    updatedFlatDoc[partnersRefusalKey] = formData.partnersRefusalDays;
  }

  if (formData.taxYearEnd) {
    const taxKey = `${documentTitle}.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.e.tax_year_date_placeholder`;
    updatedFlatDoc[taxKey] = formatDate(formData.taxYearEnd);
  }

  if (formData.capitalContributionDeadline) {
    const capitalKey = `${documentTitle}.SECTION_V_ORGANIZATIONAL_MATTERS.subsections.f.contribution_deadline_placeholder`;
    updatedFlatDoc[capitalKey] = formatDate(formData.capitalContributionDeadline);
  }

  // Handle "Other" fields
  if (formData.changesVoteOther) {
    const changesOtherKey = `${documentTitle}.SECTION_III_VOTING.subsections.b.change_options.other.other_placeholder`;
    updatedFlatDoc[changesOtherKey] = formData.changesVoteOther;
  }

  if (formData.managingPartners) {
    const managingKey = `${documentTitle}.SECTION_IV_PARTNER_DUTIES.subsections.c.management_options.specific_partners.partner_names_placeholder`;
    updatedFlatDoc[managingKey] = formData.managingPartners;
  }

  if (formData.workingPartners) {
    const workingKey = `${documentTitle}.SECTION_IV_PARTNER_DUTIES.subsections.d.work_options.specific_partners.partner_names_placeholder`;
    updatedFlatDoc[workingKey] = formData.workingPartners;
  }

  return updatedFlatDoc;
}

function updateDocumentWithFormData(formData) {
  const templateDoc = getDocumentTemplate();
  const flatTemplate = flattenObject(templateDoc);
  const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, formData);
  const updatedDoc = unflattenObject(updatedFlatDoc);
  window.currentDocument = updatedDoc;
  console.log("Updated document with form data:", window.currentDocument);
}

// Save selection for inserted content
let savedRange = null;

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

function updatePreview() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) {
    console.error("Preview element not found");
    return;
  }

  try {
    const html = convertToHtml(window.currentDocument);
    previewElem.innerHTML = html;
  } catch (error) {
    console.error("Error updating preview:", error);
    previewElem.innerHTML = '<div class="error">Error loading document preview</div>';
  }
}

function splitPath(path) {
  return path.split(".").map(part => part.trim());
}

function downloadWordDocx() {
  const content = document.getElementById("documentPreview").innerHTML;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Limited Liability Partnership Agreement</title>
      <style>
        body {
          font-family: "Times New Roman", serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #000;
          margin: 1in;
        }
        .document-title {
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 30pt;
        }
        .legal-section {
          margin: 20pt 0;
        }
        .legal-section strong {
          font-weight: bold;
        }
        p {
          margin: 10pt 0;
          text-align: justify;
        }
        .signature-section {
          margin-top: 40pt;
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
  link.download = "Limited_Liability_Partnership_Agreement.docx";
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

// Expose functions to global scope
window.showQuestionnaire = showQuestionnaire;
window.handlePartnerCountChange = handlePartnerCountChange;
window.handleTermTypeChange = handleTermTypeChange;
window.handleMeetingTypeChange = handleMeetingTypeChange;
window.handleCheckboxChange = handleCheckboxChange;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.closeEditDialog = closeEditDialog;
window.toggleEditMode = toggleEditMode;
window.downloadWordDocx = downloadWordDocx;