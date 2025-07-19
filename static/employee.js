const sectionOrder = [
  "TERMS AND CONDITIONS OF EMPLOYMENT",
  "PARTIES",
  "GENERAL",
  "DUTIES AND JOB TITLE",
  "DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD",
  "HOURS OF WORK",
  "PLACE OF WORK",
  "REMUNERATION",
  "COLLECTIVE AGREEMENTS",
  "HOLIDAYS",
  "SICKNESS ABSENCE",
  "MATERNITY AND PATERNITY RIGHTS",
  "PENSION",
  "NON COMPULSORY RETIREMENT",
  "RESTRICTIONS AND CONFIDENTIALITY",
  "MOBILITY",
  "GRIEVANCE PROCEDURE",
  "DISCIPLINARY PROCEDURE",
  "EMPLOYEE HANDBOOK AND EMPLOYMENT POLICIES",
  "TERMINATION OF EMPLOYMENT",
  "DATA PROTECTION",
  "CONFIDENTIAL INFORMATION",
  "COPYRIGHT INVENTIONS AND PATENTS",
  "CHANGES TO TERMS AND CONDITIONS OF EMPLOYMENT",
  "SEVERABILITY",
  "JURISDICTION",
  "SIGNATURES",
];

/**
 * Flattens a nested object into a flat object with dot notation keys
 * @param {Object} obj - The nested object to flatten
 * @param {String} prefix - The prefix for keys (used in recursion)
 * @return {Object} A flat object with dot notation keys
 */
function flattenObject(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      // Recursively flatten nested objects
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else {
      // Add leaf node
      acc[prefixedKey] = obj[key];
    }

    return acc;
  }, {});
}

/**
 * Unflatten a flat object with dot notation keys back into a nested object
 * @param {Object} flatObj - The flat object to unflatten
 * @return {Object} A nested object
 */
function unflattenObject(flatObj) {
  const result = {};

  Object.keys(flatObj).forEach((key) => {
    const value = flatObj[key];
    const keys = splitPath(key);
    let current = result;

    // Navigate to the right spot in the result object
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        // Set the value at the last key
        current[k] = value;
      } else {
        // Create the nested object if it doesn't exist
        current[k] = current[k] || {};
        current = current[k];
      }
    });
  });

  return result;
}

/**
 * Initialize the document template by storing a clean copy
 * of the initial document structure
 */
let documentTemplate;
function initializeDocumentTemplate() {
  // Clone the initial document structure
  documentTemplate = JSON.parse(JSON.stringify(window.currentDocument));
}

/**
 * Get a clean copy of the document template
 * @return {Object} A fresh document template
 */
function getDocumentTemplate() {
  if (!documentTemplate) {
    initializeDocumentTemplate();
  }
  return JSON.parse(JSON.stringify(documentTemplate));
}

// Global variables to store selection information
let selectedText = "";
let selectionRange = null;

function handleTextSelection() {
  const selection = window.getSelection();

  if (
    selection.toString().trim().length > 0 &&
    document.getElementById("documentPreview").contains(selection.anchorNode)
  ) {
    // Store the selected text and range
    selectedText = selection.toString();
    selectionRange = selection.getRangeAt(0);

    // Get position for the edit button
    const rect = selectionRange.getBoundingClientRect();

    // Show the edit button near the selection
    showEditWithAIButton(rect);
  } else {
    // Remove the edit button if no text is selected
    const editButton = document.getElementById("edit-ai-button");
    if (editButton) {
      editButton.remove();
    }
  }
}

function showEditWithAIButton(rect) {
  // Remove any existing button
  const existingButton = document.getElementById("edit-ai-button");
  if (existingButton) {
    existingButton.remove();
  }

  // Create button element
  const editButton = document.createElement("div");
  editButton.id = "edit-ai-button";
  editButton.className = "floating-edit-button";
  editButton.innerHTML = `<button class="btn btn-edit">Edit with AI</button>`;

  // Position the button near the selection
  editButton.style.position = "absolute";
  editButton.style.left = `${rect.left + window.scrollX}px`;
  editButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
  editButton.style.zIndex = "1000";

  // Add click event
  editButton.querySelector("button").addEventListener("click", openEditDialog);

  // Add to document
  document.body.appendChild(editButton);
}

function openEditDialog() {
  // Create dialog if it doesn't exist
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
    document
      .getElementById("submit-ai-edit")
      .addEventListener("click", submitAIEditRequest);
  }

  // Populate selected text
  document.getElementById("selected-text-display").textContent = selectedText;

  // Show the dialog
  dialog.style.display = "block";

  // Remove the floating button
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
/**
 * Get or calculate AI suggestions for a specific field
 * @param {String} path - The path to the field to update
 */
function updateValueWithAI(path) {
  const inputElement = document.querySelector(`input[data-key="${path}"]`);
  const promptElement = document.querySelector(`textarea[data-key="${path}"]`);
  const currentValue = inputElement ? inputElement.value : "";
  const customPrompt = promptElement ? promptElement.value : "";

  const aiSuggestionInput = document.querySelector(
    `input[data-ai-suggestion="${path}"]`
  );
  const saveButton = document.querySelector(
    `button.save-button[onclick="saveValue('${path}')"]`
  );

  if (!aiSuggestionInput) return;

  // Update UI to show loading state
  const aiButton = document.querySelector(
    `button.ai-button[onclick="updateValueWithAI('${path}')"]`
  );
  const originalButtonText = aiButton.textContent;
  aiButton.textContent = "Loading...";
  aiButton.disabled = true;

  // Create default prompt if none was provided
  const prompt = customPrompt || `Please improve this text: "${currentValue}"`;

  // Make API request to get AI suggestion
  fetch("/update_value", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      selectedText: currentValue,
      prompt: prompt,
      fullContent: document.getElementById("documentPreview").innerHTML,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      // Update UI with the AI suggestion
      aiSuggestionInput.value = data.value;
      saveButton.disabled = false;
    })
    .catch((error) => {
      console.error("Error getting AI suggestion:", error);
      aiSuggestionInput.value = "Error: " + error.message;
    })
    .finally(() => {
      // Reset button state
      aiButton.textContent = originalButtonText;
      aiButton.disabled = false;
    });
}
function submitAIEditRequest() {
  // Get the prompt from the textarea
  const prompt = document.getElementById("ai-edit-prompt").value;

  if (!prompt.trim()) {
    alert("Please enter instructions for the AI.");
    return;
  }

  // Get the full document content
  const fullContent = document.getElementById("documentPreview").innerHTML;

  // Update button to show loading state
  const submitButton = document.getElementById("submit-ai-edit");
  const originalText = submitButton.textContent;
  submitButton.textContent = "Processing...";
  submitButton.disabled = true;

  // Make the API request
  fetch("/update_value", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      selectedText: selectedText,
      prompt: prompt,
      fullContent: fullContent,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      // Update the document with the new text
      updateDocumentWithAIResponse(data.value);

      // Close the dialog
      closeEditDialog();
    })
    .catch((error) => {
      alert("Error: " + error.message);
    })
    .finally(() => {
      // Reset button state
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}
function updateDocumentWithAIResponse(newText) {
  if (!selectionRange) return;

  // Delete the original text
  selectionRange.deleteContents();

  // Insert the new text
  const textNode = document.createTextNode(newText);
  selectionRange.insertNode(textNode);

  // Clear the selection variables
  selectedText = "";
  selectionRange = null;

  // Optionally show a success message
  const successMessage = document.createElement("div");
  successMessage.className = "success";
  successMessage.textContent = "Text updated successfully";
  successMessage.style.position = "fixed";
  successMessage.style.bottom = "20px";
  successMessage.style.right = "20px";
  successMessage.style.padding = "10px 20px";
  document.body.appendChild(successMessage);

  // Remove the message after 3 seconds
  setTimeout(() => {
    successMessage.remove();
  }, 3000);
}

// Predefined questions for employee contract
const documentQuestions = {
  step1: {
    title: "Employer and Employee Details",
    employerName: {
      question: "Employer name",
      type: "text",
    },
    employerRegistration: {
      question: "Registration number (if applicable)",
      type: "text",
    },
    employerAddress: {
      question: "Employer address",
      type: "text",
    },
    employeeName: {
      question: "Employee name",
      type: "text",
    },
    employeeAddress: {
      question: "Employee address",
      type: "text",
    },
  },
  step2: {
    title: "Job Details",
    jobTitle: {
      question: "Job title",
      type: "text",
    },
    jobDutiesType: {
      question: "Type of job duties",
      type: "select",
      options: ["General duties as determined by employer", "Specific duties"],
    },
    specificDuties: {
      question: "Specify job duties",
      type: "textarea",
      showIf: "jobDutiesType=Specific duties",
    },
    startDate: {
      question: "Employment start date",
      type: "date",
    },
    continuousEmployment: {
      question: "Does previous employment count as continuous employment?",
      type: "select",
      options: ["No", "Yes"],
    },
    previousEmployer: {
      question: "Name of previous employer",
      type: "text",
      showIf: "continuousEmployment=Yes",
    },
    previousEmploymentDate: {
      question: "Start date with previous employer",
      type: "date",
      showIf: "continuousEmployment=Yes",
    },
    contractType: {
      question: "Type of employment contract",
      type: "select",
      options: ["Temporary", "Fixed term", "Open-ended"],
    },
    temporaryEndDate: {
      question: "Expected end date",
      type: "date",
      showIf: "contractType=Temporary",
    },
    temporaryNoticePeriod: {
      question: "Notice period (days/weeks)",
      type: "text",
      showIf: "contractType=Temporary",
    },
    fixedTermEndDate: {
      question: "Contract end date",
      type: "date",
      showIf: "contractType=Fixed term",
    },
    fixedTermNoticePeriod: {
      question: "Notice period (days/weeks)",
      type: "text",
      showIf: "contractType=Fixed term",
    },
    probationPeriod: {
      question: "Probation period (months)",
      type: "text",
      showIf: "contractType=Open-ended",
    },
  },
  step3: {
    title: "Working Hours and Location",
    workStartTime: {
      question: "Work start time",
      type: "text",
    },
    workEndTime: {
      question: "Work end time",
      type: "text",
    },
    lunchStartTime: {
      question: "Lunch start time",
      type: "text",
    },
    lunchEndTime: {
      question: "Lunch end time",
      type: "text",
    },
    overtimeOption: {
      question: "Overtime arrangement",
      type: "select",
      options: ["Paid overtime", "No overtime payment"],
    },
    overtimeDetails: {
      question: "Overtime payment details",
      type: "textarea",
      showIf: "overtimeOption=Paid overtime",
    },
    workLocation: {
      question: "Primary work location",
      type: "text",
    },
    workAddress: {
      question: "Work address",
      type: "text",
    },
  },
  step4: {
    title: "Compensation and Benefits",
    salary: {
      question: "Annual salary (£)",
      type: "text",
    },
    paymentFrequency: {
      question: "Payment frequency",
      type: "select",
      options: ["Monthly", "Bi-weekly", "Weekly"],
    },
    paymentDate: {
      question: "Regular payment date",
      type: "text",
    },
    paymentMethod: {
      question: "Payment method",
      type: "select",
      options: ["Direct bank transfer", "Check", "Other"],
    },
    collectiveAgreement: {
      question: "Is employment subject to collective agreements?",
      type: "select",
      options: ["No", "Yes"],
    },
    agreementDetails: {
      question: "Specify collective agreement",
      type: "text",
      showIf: "collectiveAgreement=Yes",
    },
    holidayDays: {
      question: "Annual holiday entitlement (days)",
      type: "text",
      default: "28",
    },
    holidayYearStart: {
      question: "Holiday year start date",
      type: "text",
    },
    holidayYearEnd: {
      question: "Holiday year end date",
      type: "text",
    },
    sickPayOption: {
      question: "Sick pay arrangement",
      type: "select",
      options: ["Statutory Sick Pay only", "Occupational sick pay"],
    },
    occupationalSickDays: {
      question: "Occupational sick pay days",
      type: "text",
      showIf: "sickPayOption=Occupational sick pay",
    },
    pensionOption: {
      question: "Pension arrangement",
      type: "select",
      options: ["No pension", "Designated pension scheme", "Auto-enrollment"],
    },
    pensionName: {
      question: "Pension scheme name",
      type: "text",
      showIf: "pensionOption=Designated pension scheme",
    },
    employerContribution: {
      question: "Employer contribution (%)",
      type: "text",
      showIf: "pensionOption=Designated pension scheme",
    },
    employeeContribution: {
      question: "Maximum employee contribution (%)",
      type: "text",
      showIf: "pensionOption=Designated pension scheme",
    },
  },
  step5: {
    title: "Notice Period and Legal",
    noticeOption: {
      question: "Notice period arrangement",
      type: "select",
      options: ["Standard progressive", "Statutory minimum"],
    },
    // Replace the single jurisdiction field with these two fields
    governingLaw: {
      question: "Governing Law",
      type: "text",
      default: "England and Wales",
    },
    jurisdictionCourts: {
      question: "Courts with Jurisdiction",
      type: "text",
      default: "England and Wales",
    },
  },
};

// Map form fields to document paths - Updated to match new JSON structure
const documentPathMap = {
  // Employer and Employee details
  employerName: ["Employee Contract.PARTIES.a"],
  employerRegistration: ["Employee Contract.PARTIES.a"],
  employerAddress: ["Employee Contract.PARTIES.a"],
  employeeName: ["Employee Contract.PARTIES.b"],
  employeeAddress: ["Employee Contract.PARTIES.b"],

  // Job details
  jobTitle: ["Employee Contract.DUTIES AND JOB TITLE.a"],
  jobDutiesType: ["Employee Contract.DUTIES AND JOB TITLE.options"],
  specificDuties: ["Employee Contract.DUTIES AND JOB TITLE.options"],
  startDate: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.date",
  ],
  continuousEmployment: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options1",
  ],
  previousEmployer: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options1",
  ],
  previousEmploymentDate: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options1",
  ],
  contractType: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2",
  ],
  temporaryEndDate: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2",
  ],
  temporaryNoticePeriod: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2",
  ],
  fixedTermEndDate: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2",
  ],
  fixedTermNoticePeriod: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2",
  ],
  probationPeriod: [
    "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2",
  ],

  // Working hours and location
  workStartTime: ["Employee Contract.HOURS OF WORK.a"],
  workEndTime: ["Employee Contract.HOURS OF WORK.a"],
  lunchStartTime: ["Employee Contract.HOURS OF WORK.a"],
  lunchEndTime: ["Employee Contract.HOURS OF WORK.a"],
  overtimeOption: ["Employee Contract.HOURS OF WORK.options"],
  overtimeDetails: ["Employee Contract.HOURS OF WORK.options"],
  workLocation: ["Employee Contract.PLACE OF WORK.text"],
  workAddress: ["Employee Contract.PLACE OF WORK.text"],

  // Compensation and benefits
  salary: ["Employee Contract.REMUNERATION.a"],
  paymentFrequency: ["Employee Contract.REMUNERATION.b"],
  paymentDate: ["Employee Contract.REMUNERATION.b"],
  paymentMethod: ["Employee Contract.REMUNERATION.c"],
  collectiveAgreement: ["Employee Contract.COLLECTIVE AGREEMENTS.options"],
  agreementDetails: ["Employee Contract.COLLECTIVE AGREEMENTS.options"],
  holidayDays: ["Employee Contract.HOLIDAYS.a"],
  holidayYearStart: ["Employee Contract.HOLIDAYS.b"],
  holidayYearEnd: ["Employee Contract.HOLIDAYS.b"],
  sickPayOption: ["Employee Contract.SICKNESS ABSENCE.options"],
  occupationalSickDays: ["Employee Contract.SICKNESS ABSENCE.options"],
  pensionOption: ["Employee Contract.PENSION.options"],
  pensionName: ["Employee Contract.PENSION.options"],
  employerContribution: ["Employee Contract.PENSION.options"],
  employeeContribution: ["Employee Contract.PENSION.options"],

  // Notice and legal
  noticeOption: ["Employee Contract.TERMINATION OF EMPLOYMENT.options"],
  // Replace the single jurisdiction mapping with these two mappings
  governingLaw: ["Employee Contract.JURISDICTION.a"],
  jurisdictionCourts: ["Employee Contract.JURISDICTION.b"],
};

/**
 * Highlights document sections affected by a specific form field
 * @param {string} fieldId - The ID of the form field being focused
 */
function highlightDocumentSection(fieldId) {
  // Clear any existing highlights first
  clearHighlights();

  // Get the paths this field affects
  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;

  // Find and highlight all elements with matching data-value-path
  const previewElem = document.getElementById("documentPreview");
  paths.forEach((path) => {
    // Find elements with this path
    const elements = previewElem.querySelectorAll(
      `[data-value-path="${path}"]`
    );
    if (elements.length === 0) {
      // Try finding parent section if exact path not found
      const basePathParts = path.split(".");
      basePathParts.pop(); // Remove the last part (usually "content")
      const basePath = basePathParts.join(".");
      const parentElements = previewElem.querySelectorAll(
        `[data-path="${basePath}"]`
      );

      parentElements.forEach((elem) => {
        elem.classList.add("highlighted-section");
      });
    } else {
      elements.forEach((elem) => {
        elem.classList.add("highlighted");
      });
    }
  });

  // Scroll to the first highlighted element
  setTimeout(() => {
    const firstHighlighted = document.querySelector(
      ".highlighted, .highlighted-section"
    );
    if (firstHighlighted) {
      firstHighlighted.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 1);
}

/**
 * Removes all highlighting from the document preview
 */
function clearHighlights() {
  const previewElem = document.getElementById("documentPreview");
  const highlightedElements = previewElem.querySelectorAll(
    ".highlighted, .highlighted-section"
  );
  highlightedElements.forEach((element) => {
    element.classList.remove("highlighted");
    element.classList.remove("highlighted-section");
  });
}

/**
 * Maps form data to document structure
 * @param {Object} flatDoc - Flattened document object
 * @param {Object} formData - The form data
 * @return {Object} Updated flat document
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };

  // Employer information
  if (
    formData.employerName ||
    formData.employerRegistration ||
    formData.employerAddress
  ) {
    const employerName = formData.employerName || "*[Name of Employer]*";
    const registration = formData.employerRegistration || "[ ]";
    const employerAddress = formData.employerAddress || "*[Address]*";

    updatedFlatDoc[
      "Employee Contract.PARTIES.a"
    ] = `${employerName}, an organisation registered in England and Wales under registration number ${registration} whose registered office is at ${employerAddress} ("the Employer").`;
  }

  // Employee information
  if (formData.employeeName || formData.employeeAddress) {
    const employeeName = formData.employeeName || "*[Name of Employee]*";
    const employeeAddress = formData.employeeAddress || "*[Address]*";

    updatedFlatDoc[
      "Employee Contract.PARTIES.b"
    ] = `${employeeName} of ${employeeAddress} ("you").`;
  }

  // Job title
  if (formData.jobTitle) {
    updatedFlatDoc[
      "Employee Contract.DUTIES AND JOB TITLE.a"
    ] = `You are employed in the capacity of ${formData.jobTitle}.`;
  }

  // Job duties - USING CORRECT PATH FOR SELECTED VALUE
  if (formData.jobDutiesType === "General duties as determined by employer") {
    updatedFlatDoc["Employee Contract.DUTIES AND JOB TITLE.options"] = [
      "Such duties and responsibilities as may be determined by the Employer from time to time.",
      "The following duties and responsibilities: *[Job description and/or brief summary of duties and responsibilities]*.",
    ];
    // CORRECTED: Use the proper path structure matching JSON
    updatedFlatDoc["Employee Contract.DUTIES AND JOB TITLE.selected"] =
      "Such duties and responsibilities as may be determined by the Employer from time to time.";
  } else if (
    formData.jobDutiesType === "Specific duties" &&
    formData.specificDuties
  ) {
    updatedFlatDoc["Employee Contract.DUTIES AND JOB TITLE.options"] = [
      "Such duties and responsibilities as may be determined by the Employer from time to time.",
      `The following duties and responsibilities: ${formData.specificDuties}.`,
    ];
    // CORRECTED: Use the proper path structure matching JSON
    updatedFlatDoc[
      "Employee Contract.DUTIES AND JOB TITLE.selected"
    ] = `The following duties and responsibilities: ${formData.specificDuties}.`;
  }

  // Employment date
  if (formData.startDate) {
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.date"
    ] = formData.startDate;
  }

  // Continuous employment
  if (formData.continuousEmployment === "No") {
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options1"
    ] = [
      "No employment with a previous employer counts as part of your continuous employment.",
      "Your employment with *[name of previous employer]* which began on *[Date]* will count as part of your continuous employment.",
    ];
    // CORRECTED: Use selected1 instead of options1.selected
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.selected1"
    ] =
      "No employment with a previous employer counts as part of your continuous employment.";
  } else if (
    formData.continuousEmployment === "Yes" &&
    formData.previousEmployer &&
    formData.previousEmploymentDate
  ) {
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options1"
    ] = [
      "No employment with a previous employer counts as part of your continuous employment.",
      `Your employment with ${formData.previousEmployer} which began on ${formData.previousEmploymentDate} will count as part of your continuous employment.`,
    ];
    // CORRECTED: Use selected1 instead of options1.selected
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.selected1"
    ] = `Your employment with ${formData.previousEmployer} which began on ${formData.previousEmploymentDate} will count as part of your continuous employment.`;
  }

  // Contract type
  if (
    formData.contractType === "Temporary" &&
    formData.temporaryEndDate &&
    formData.temporaryNoticePeriod
  ) {
    const newValue = `Temporary: Employment expected to continue until ${formData.temporaryEndDate}; terminable by either party with ${formData.temporaryNoticePeriod} notice in writing; summary termination for gross misconduct.`;

    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2"
    ] = [
      newValue,
      "Fixed term: Employment will terminate on *[date]*; terminable by either party with *[number]* notice in writing; summary termination for gross misconduct.",
      "Open-ended: First *[number]* months probation; performance review; may extend probation; one week's notice by either party during probation; contract annulment of prior agreements.",
    ];
    // CORRECTED: Use selected2 instead of options2.selected
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.selected2"
    ] = newValue;
  } else if (
    formData.contractType === "Fixed term" &&
    formData.fixedTermEndDate &&
    formData.fixedTermNoticePeriod
  ) {
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2"
    ] = [
      "Temporary: Employment expected to continue until *[date]*; terminable by either party with *[number]* notice in writing; summary termination for gross misconduct.",
      `Fixed term: Employment will terminate on ${formData.fixedTermEndDate}; terminable by either party with ${formData.fixedTermNoticePeriod} notice in writing; summary termination for gross misconduct.`,
      "Open-ended: First *[number]* months probation; performance review; may extend probation; one week's notice by either party during probation; contract annulment of prior agreements.",
    ];
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.selected2"
    ] =
      updatedFlatDoc[
        "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2"
      ][1];
  } else if (
    formData.contractType === "Open-ended" &&
    formData.probationPeriod
  ) {
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2"
    ] = [
      "Temporary: Employment expected to continue until *[date]*; terminable by either party with *[number]* notice in writing; summary termination for gross misconduct.",
      "Fixed term: Employment will terminate on *[date]*; terminable by either party with *[number]* notice in writing; summary termination for gross misconduct.",
      `Open-ended: First ${formData.probationPeriod} months probation; performance review; may extend probation; one week's notice by either party during probation; contract annulment of prior agreements.`,
    ];
    updatedFlatDoc[
      "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.selected2"
    ] =
      updatedFlatDoc[
        "Employee Contract.DATE OF COMMENCEMENT AND CONTINUOUS EMPLOYMENT AND NOTICE PERIOD.options2"
      ][2];
  }

  // Working hours
  if (
    formData.workStartTime &&
    formData.workEndTime &&
    formData.lunchStartTime &&
    formData.lunchEndTime
  ) {
    updatedFlatDoc[
      "Employee Contract.HOURS OF WORK.a"
    ] = `${formData.workStartTime} am to ${formData.workEndTime} pm Mondays to Fridays with one hour for lunch between ${formData.lunchStartTime} and ${formData.lunchEndTime} pm.`;
  }

  // Overtime
  if (formData.overtimeOption === "Paid overtime" && formData.overtimeDetails) {
    const newValue = `You will be paid for any overtime worked in addition to your normal hours on the following basis: ${formData.overtimeDetails}.`;

    updatedFlatDoc["Employee Contract.HOURS OF WORK.options"] = [
      newValue,
      "Additional hours may be required when reasonably asked; you will not be entitled to overtime payments.",
    ];
    // Store in the correct location
    updatedFlatDoc["Employee Contract.HOURS OF WORK.selected"] = newValue;
  } else if (formData.overtimeOption === "No overtime payment") {
    updatedFlatDoc["Employee Contract.HOURS OF WORK.options"] = [
      "You will be paid for any overtime worked in addition to your normal hours on the following basis: *[specify]*.",
      "Additional hours may be required when reasonably asked; you will not be entitled to overtime payments.",
    ];
    // Store in the correct location
    updatedFlatDoc["Employee Contract.HOURS OF WORK.selected"] =
      "Additional hours may be required when reasonably asked; you will not be entitled to overtime payments.";
  }

  // Work location
  if (formData.workLocation && formData.workAddress) {
    updatedFlatDoc[
      "Employee Contract.PLACE OF WORK.text"
    ] = `Your normal place of work will be ${formData.workLocation}, ${formData.workAddress} or such other places as the Employer may reasonably require.`;
  }

  // Salary
  if (formData.salary) {
    updatedFlatDoc[
      "Employee Contract.REMUNERATION.a"
    ] = `Your salary is £${formData.salary} per year.`;
  }

  // Payment details
  if (formData.paymentFrequency && formData.paymentDate) {
    updatedFlatDoc[
      "Employee Contract.REMUNERATION.b"
    ] = `Paid ${formData.paymentFrequency.toLowerCase()} normally on ${
      formData.paymentDate
    }.`;
  }

  // Payment method
  if (formData.paymentMethod) {
    const method =
      formData.paymentMethod === "Other"
        ? "other"
        : formData.paymentMethod.toLowerCase();
    updatedFlatDoc[
      "Employee Contract.REMUNERATION.c"
    ] = `Payment will be made by ${method}.`;
  }

  // Collective agreements
  if (formData.collectiveAgreement === "No") {
    updatedFlatDoc["Employee Contract.COLLECTIVE AGREEMENTS.options"] = [
      "There are no collective agreements relevant to your employment.",
      "Your employment is subject to the collective agreement: *[specify agreement]*.",
    ];
    updatedFlatDoc["Employee Contract.COLLECTIVE AGREEMENTS.selected"] =
      updatedFlatDoc["Employee Contract.COLLECTIVE AGREEMENTS.options"][0];
  } else if (
    formData.collectiveAgreement === "Yes" &&
    formData.agreementDetails
  ) {
    updatedFlatDoc["Employee Contract.COLLECTIVE AGREEMENTS.options"] = [
      "There are no collective agreements relevant to your employment.",
      `Your employment is subject to the collective agreement: ${formData.agreementDetails}.`,
    ];
    updatedFlatDoc["Employee Contract.COLLECTIVE AGREEMENTS.selected"] =
      updatedFlatDoc["Employee Contract.COLLECTIVE AGREEMENTS.options"][1];
  }

  // Holidays
  if (formData.holidayDays) {
    updatedFlatDoc[
      "Employee Contract.HOLIDAYS.a"
    ] = `You are entitled to ${formData.holidayDays} days including statutory and public holidays per calendar year.`;
  }

  if (formData.holidayYearStart && formData.holidayYearEnd) {
    updatedFlatDoc[
      "Employee Contract.HOLIDAYS.b"
    ] = `Holiday year commences on ${formData.holidayYearStart} and finishes on ${formData.holidayYearEnd}.`;
  }

  // Sick pay
  if (formData.sickPayOption === "Statutory Sick Pay only") {
    updatedFlatDoc["Employee Contract.SICKNESS ABSENCE.options"] = [
      "Statutory Sick Pay after four days; no contractual pay.",
      "Occupational sick pay up to *[ ]* days, then SSP.",
    ];
    updatedFlatDoc["Employee Contract.SICKNESS ABSENCE.selected"] =
      updatedFlatDoc["Employee Contract.SICKNESS ABSENCE.options"][0];
  } else if (
    formData.sickPayOption === "Occupational sick pay" &&
    formData.occupationalSickDays
  ) {
    updatedFlatDoc["Employee Contract.SICKNESS ABSENCE.options"] = [
      "Statutory Sick Pay after four days; no contractual pay.",
      `Occupational sick pay up to ${formData.occupationalSickDays} days, then SSP.`,
    ];
    updatedFlatDoc["Employee Contract.SICKNESS ABSENCE.selected"] =
      updatedFlatDoc["Employee Contract.SICKNESS ABSENCE.options"][1];
  }

  // Pension
  if (formData.pensionOption === "No pension") {
    updatedFlatDoc["Employee Contract.PENSION.options"] = [
      "No pension arrangements.",
      "Designated pension scheme *[name]*; Employer contributes *[%]*; Employee may contribute up to *[%]*.",
      "Auto-enrolment in pension scheme per auto-enrolment obligations; scheme rules apply; opt-out rights.",
    ];
    updatedFlatDoc["Employee Contract.PENSION.selected"] =
      updatedFlatDoc["Employee Contract.PENSION.options"][0];
  } else if (
    formData.pensionOption === "Designated pension scheme" &&
    formData.pensionName &&
    formData.employerContribution &&
    formData.employeeContribution
  ) {
    updatedFlatDoc["Employee Contract.PENSION.options"] = [
      "No pension arrangements.",
      `Designated pension scheme ${formData.pensionName}; Employer contributes ${formData.employerContribution}%; Employee may contribute up to ${formData.employeeContribution}%.`,
      "Auto-enrolment in pension scheme per auto-enrolment obligations; scheme rules apply; opt-out rights.",
    ];
    updatedFlatDoc["Employee Contract.PENSION.selected"] =
      updatedFlatDoc["Employee Contract.PENSION.options"][1];
  } else if (formData.pensionOption === "Auto-enrollment") {
    updatedFlatDoc["Employee Contract.PENSION.options"] = [
      "No pension arrangements.",
      "Designated pension scheme *[name]*; Employer contributes *[%]*; Employee may contribute up to *[%]*.",
      "Auto-enrolment in pension scheme per auto-enrolment obligations; scheme rules apply; opt-out rights.",
    ];
    updatedFlatDoc["Employee Contract.PENSION.selected"] =
      updatedFlatDoc["Employee Contract.PENSION.options"][2];
  }

  // Notice period
  if (formData.noticeOption === "Standard progressive") {
    updatedFlatDoc["Employee Contract.TERMINATION OF EMPLOYMENT.options"] = [
      "During the *[ ]* months probationary period, notice by either party is one week. After completion, you give one month's notice; Employer gives one month plus one week per complete year after four years up to 12 weeks. Employer may pay salary in lieu. Summary termination for serious breach or gross misconduct applies.",
      "Statutory notice option: Employer notice: one week for <2 yrs, two weeks plus one per extra year up to max 12 weeks for >=12 yrs; Employee notice: one day if <1 month, one week if >=1 month. Employer may pay salary in lieu. Summary termination for serious breach or gross misconduct applies.",
    ];
    updatedFlatDoc["Employee Contract.TERMINATION OF EMPLOYMENT.selected"] =
      updatedFlatDoc["Employee Contract.TERMINATION OF EMPLOYMENT.options"][0];
  } else if (formData.noticeOption === "Statutory minimum") {
    updatedFlatDoc["Employee Contract.TERMINATION OF EMPLOYMENT.options"] = [
      "During the *[ ]* months probationary period, notice by either party is one week. After completion, you give one month's notice; Employer gives one month plus one week per complete year after four years up to 12 weeks. Employer may pay salary in lieu. Summary termination for serious breach or gross misconduct applies.",
      "Statutory notice option: Employer notice: one week for <2 yrs, two weeks plus one per extra year up to max 12 weeks for >=12 yrs; Employee notice: one day if <1 month, one week if >=1 month. Employer may pay salary in lieu. Summary termination for serious breach or gross misconduct applies.",
    ];
    updatedFlatDoc["Employee Contract.TERMINATION OF EMPLOYMENT.selected"] =
      updatedFlatDoc["Employee Contract.TERMINATION OF EMPLOYMENT.options"][1];
  }

  // Jurisdiction
  if (formData.governingLaw) {
    updatedFlatDoc[
      "Employee Contract.JURISDICTION.a"
    ] = `This Agreement governed by ${formData.governingLaw} Law.`;
  }
  if (formData.jurisdictionCourts) {
    updatedFlatDoc[
      "Employee Contract.JURISDICTION.b"
    ] = `This Agreement subject to the jurisdiction of ${formData.jurisdictionCourts} Courts.`;
  }

  return updatedFlatDoc;
}

// Store form data between steps
let formDataStore = {};

// Setup event listeners and initialization
document.addEventListener("DOMContentLoaded", function () {
  console.log("Employee contract initialization started");

  try {
    // Initialize document template
    initializeDocumentTemplate();

    // Show questionnaire
    showQuestionnaire();

    // Initialize preview
    updatePreview();

    // Register highlighting events after questionnaire is shown
    setTimeout(registerHighlightEvents, 500);

    // Initialize AI editing functionality
    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    console.log("Employee contract initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

/**
 * Convert document object to HTML for preview
 */
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];
  if (documentTitle) {
    html.push(
      `<div class="document-title"><strong>${documentTitle}</strong></div>`
    );
    const mainContent = document[documentTitle];

    // Process all sections
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSection(section, mainContent[section], 0, documentTitle);
      }
    });
  }
  return html.join("");

  function processSection(key, value, level, path) {
    const currentPath = path ? `${path}.${key}` : key;
    const isMainSection = sectionOrder.includes(key);
    const marginLeft = level * 20;
    const sectionClass = isMainSection ? "main-section" : "sub-section";

    // Render section header
    if (isMainSection) {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
          <h5><strong>${key}</strong></h5>
        </div>`
      );
    } else {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${
          marginLeft + 20
        }px;">
          <h6><strong>${key}</strong></h6>
        </div>`
      );
    }

    if (typeof value === "object" && value !== null) {
      // Process options with selected value if applicable
      if (Array.isArray(value) && key.toLowerCase().includes("options")) {
        // Get the parent object to check for selected values
        const parentObject = getObjectAtPath(document, path);

        // Get selection key based on options name
        let selectionKey = "selected";
        if (key === "options1") selectionKey = "selected1";
        if (key === "options2") selectionKey = "selected2";

        // Find the selected value
        const selectedValue =
          parentObject && parentObject[selectionKey]
            ? parentObject[selectionKey]
            : value[0];

        console.log(
          `Options at ${currentPath}, selection key: ${selectionKey}, value: ${selectedValue}`
        );

        html.push(
          `<div class="document-line document-content" data-path="${currentPath}" style="margin-left: ${
            marginLeft + 40
          }px;">
            <span data-value-path="${currentPath}">
              ${selectedValue}
            </span>
          </div>`
        );
      } else {
        // Process normal object
        Object.keys(value).forEach((subKey) => {
          const subValue = value[subKey];
          const subMarginLeft = marginLeft + 40;

          // Skip processing selection keys directly
          if (
            subKey === "selected" ||
            subKey === "selected1" ||
            subKey === "selected2"
          ) {
            return;
          }

          if (
            subValue &&
            typeof subValue === "object" &&
            !Array.isArray(subValue)
          ) {
            if (subValue.content !== undefined) {
              // Don't show subKey if it's 'content', 'title', or similar metadata fields
              const shouldShowSubKey = !["content", "title"].includes(
                subKey.toLowerCase()
              );
              html.push(
                `<div class="document-line document-content" data-path="${currentPath}.${subKey}.content" style="margin-left: ${subMarginLeft}px;">
                  <span data-value-path="${currentPath}.${subKey}.content">
                    ${shouldShowSubKey ? `<strong>${subKey}:</strong> ` : ""}${
                  subValue.content
                }
                  </span>
                </div>`
              );
            } else {
              processSection(subKey, subValue, level + 1, currentPath);
            }
          } else if (
            Array.isArray(subValue) &&
            (subKey.toLowerCase().includes("options") ||
              subKey.toLowerCase().includes("type"))
          ) {
            // Handle option array with possible selection
            const subSelectionKey =
              subKey === "options1"
                ? "selected1"
                : subKey === "options2"
                ? "selected2"
                : "selected";

            const selected = value[subSelectionKey] || subValue[0];

            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
                <span data-value-path="${currentPath}.${subKey}">
                  ${selected}
                </span>
              </div>`
            );
          } else {
            // Skip displaying metadata keys like 'title'
            const lowerSubKey = subKey.toLowerCase();
            if (["title"].includes(lowerSubKey)) {
              return;
            }
            // Hide label for 'text' keys
            const showLabel = lowerSubKey !== "text";
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
                <span data-value-path="${currentPath}.${subKey}">
                  ${showLabel ? `<strong>${subKey}:</strong> ` : ""}${subValue}
                </span>
              </div>`
            );
          }
        });
      }
    }
  }
}

// Helper function to get an object at a path
function getObjectAtPath(obj, path) {
  if (!path) return obj;
  return path.split(".").reduce((current, key) => {
    return current ? current[key] : undefined;
  }, obj);
}

function registerHighlightEvents() {
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      // Focus event (initial click)
      input.addEventListener("focus", function () {
        const fieldId = this.id;
        highlightDocumentSection(fieldId);
      });

      // Add INPUT event to maintain highlighting during editing
      input.addEventListener("input", function () {
        const fieldId = this.id;
        highlightDocumentSection(fieldId);
      });

      // Blur event (when leaving the field)
      input.addEventListener("blur", function () {
        setTimeout(() => {
          if (
            !document.activeElement ||
            !document.activeElement.hasAttribute("data-affects-path")
          ) {
            clearHighlights();
          }
        }, 100);
      });
    });
}

// Function to update document with form data
function updateDocumentWithFormData(formData) {
  // Get a clean template
  const templateDoc = getDocumentTemplate();

  // Flatten the template
  const flatTemplate = flattenObject(templateDoc);

  // Apply form data to the flat document
  const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, formData);

  // Unflatten back to the original structure
  const updatedDoc = unflattenObject(updatedFlatDoc);

  // Update the current document
  window.currentDocument = updatedDoc;

  console.log("Updated document with form data:", window.currentDocument);
}

// Utility function to split paths
function splitPath(path) {
  let parts = path.split(".");
  return parts;
}

// Add visualization and form generation functions
// (These would be similar to what's in copyright.js but adapted for employee contract)

// Make necessary functions available globally
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.updateDocumentWithFormData = updateDocumentWithFormData;

// Functions for document loading and initialization
function showQuestionnaire() {
  // Get the container for the questionnaire
  const container = document.getElementById("keyContainer");
  if (!container) {
    console.error("Questionnaire container not found");
    return;
  }

  // Create steps HTML
  let allQuestionsHTML = "";
  for (
    let stepNumber = 1;
    stepNumber <= Object.keys(documentQuestions).length;
    stepNumber++
  ) {
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

  // Add to container
  container.innerHTML = allQuestionsHTML;

  // Add change handlers for real-time updates
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      input.addEventListener("input", function () {
        // Store the value with its unique ID
        formDataStore[this.id] = this.value;

        // For conditional fields
        if (
          this.id === "jobDutiesType" ||
          this.id === "continuousEmployment" ||
          this.id === "contractType" ||
          this.id === "overtimeOption" ||
          this.id === "collectiveAgreement" ||
          this.id === "sickPayOption" ||
          this.id === "pensionOption"
        ) {
          handleFormFieldChange(this);
        } else {
          // Update document in real-time for other inputs
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Restore saved form data if available
  for (let step = 1; step <= Object.keys(documentQuestions).length; step++) {
    restoreStepData(step);
  }
}

function updatePreview() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) {
    console.error("Preview element not found");
    return;
  }

  try {
    // Debug option values before rendering
    debugOptionValues();

    const html = convertToHtml(window.currentDocument);
    previewElem.innerHTML = html;
  } catch (error) {
    console.error("Error updating preview:", error);
    previewElem.innerHTML =
      '<div class="error">Error loading document preview</div>';
  }
}

function createQuestionsHTML(stepData) {
  let html = "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions
      html += `<div class="question-group" id="${key}-group">`;
      html += createQuestionsHTML(data);
      html += "</div>";
    } else {
      // This is a single question
      html += createQuestionField(key, data);
    }
  }
  return html;
}

function createQuestionField(key, data) {
  if (!data.question) return "";

  let visibilityAttr = "";
  if (data.showIf) {
    const [condition, value] = data.showIf.split("=");
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}" style="display: none;"`;
  }

  return `
    <div class="question-field" ${visibilityAttr}>
      <label>${data.question}</label>
      ${createInputElement(key, data)}
    </div>
  `;
}

function createInputElement(key, data) {
  // Get affected paths for data attribute
  const affectedPaths = documentPathMap[key]
    ? `data-affects-path="${documentPathMap[key].join(",")}"`
    : "";

  if (data.type === "select") {
    return `
      <select id="${key}" onchange="handleFormFieldChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  }

  // Create the appropriate input element
  switch (data.type) {
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" ${affectedPaths}>${
        data.default || ""
      }</textarea>`;
    case "date":
      return `<input type="date" id="${key}" ${affectedPaths}>`;
    default:
      return `<input type="text" id="${key}" value="${
        data.default || ""
      }" ${affectedPaths}>`;
  }
}

function handleFormFieldChange(element) {
  // Save the value
  formDataStore[element.id] = element.value;

  // Handle conditional fields
  const condition = element.id;
  const value = element.value;

  document
    .querySelectorAll(`[data-show-if="${condition}"]`)
    .forEach((field) => {
      field.style.display =
        field.dataset.showValue === value ? "block" : "none";
    });

  // Update document based on new field value
  updateDocumentWithFormData(formDataStore);
  updatePreview();

  // Highlight affected sections
  highlightDocumentSection(element.id);
}

function restoreStepData(stepNumber) {
  // Restore all saved values for this step
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // Trigger change for select fields with conditional visibility
      if (input.tagName === "SELECT") {
        handleFormFieldChange(input);
      }
    }
  });
}

// Add at the beginning of your initialization function
function loadDocumentTemplate() {
  // Check if template is already loaded
  if (window.documentTemplate) {
    return Promise.resolve(window.documentTemplate);
  }

  // Load template from JSON
  return fetch("/templates/employee.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load template");
      }
      return response.json();
    })
    .then((data) => {
      window.documentTemplate = data;
      return data;
    });
}

// Then update your initialization to use this:
document.addEventListener("DOMContentLoaded", function () {
  console.log("Employee contract initialization started");

  loadDocumentTemplate()
    .then(() => {
      // Continue with initialization...
      initializeDocumentTemplate();
      showQuestionnaire();
      updatePreview();
      // ...etc
    })
    .catch((error) => {
      console.error("Error loading template:", error);
    });
});

// Make necessary functions available globally
window.showQuestionnaire = showQuestionnaire;
window.updatePreview = updatePreview;
window.handleFormFieldChange = handleFormFieldChange;

// Add these throughout your code at key points
console.log("Document structure:", window.currentDocument);
console.log("Form data store:", formDataStore);
console.log("Template loaded:", window.documentTemplate);
console.log(
  "DOM elements ready:",
  !!document.getElementById("documentPreview"),
  !!document.getElementById("keyContainer")
);

// Helper function to clean up content for DOCX
function cleanupForDocx(element) {
  // 1. Remove any highlighting classes
  const highlighted = element.querySelectorAll(
    ".highlighted, .highlighted-section"
  );
  highlighted.forEach((el) => {
    el.classList.remove("highlighted");
    el.classList.remove("highlighted-section");
  });

  // 2. Fix heading format (remove ##### and other markdown-like symbols)
  const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
  headings.forEach((heading) => {
    heading.textContent = heading.textContent.replace(/^#+\s*/, "");
  });

  // 3. Remove labels like "content:", "option1:", etc.
  const spans = element.querySelectorAll("span[data-value-path]");
  spans.forEach((span) => {
    const text = span.textContent;
    const labelMatch = text.match(/^([a-zA-Z0-9]+):\s*(.*)/);
    if (
      labelMatch &&
      labelMatch[1] &&
      (labelMatch[1].toLowerCase() === "content" ||
        labelMatch[1].toLowerCase() === "title" ||
        labelMatch[1].toLowerCase().includes("option"))
    ) {
      span.textContent = labelMatch[2];
    }
  });

  // 4. Set consistent margins and indentation
  const sections = element.querySelectorAll(".document-line");
  sections.forEach((section) => {
    section.style.marginLeft = "0";
  });

  // 5. Fix numbering format (add proper indentation for numbered clauses)
  const contentItems = element.querySelectorAll(".document-content");
  contentItems.forEach((item) => {
    // Check if this is a numbered clause (like "4.1:", "5.2:", etc.)
    const text = item.textContent;
    const numberMatch = text.match(/^(\d+\.\d+):\s*(.*)/);
    if (numberMatch) {
      item.style.paddingLeft = "0.25in";
      item.style.textIndent = "-0.25in";
    }
  });

  // 6. Apply consistent font sizes
  const titleElements = element.querySelectorAll(".document-title");
  titleElements.forEach((el) => {
    el.style.fontSize = "14pt";
    const strongs = el.querySelectorAll("strong");
    strongs.forEach((s) => (s.style.fontSize = "14pt"));
  });

  // Main sections
  const mainSections = element.querySelectorAll(".main-section h5");
  mainSections.forEach((el) => {
    el.style.fontSize = "12pt";
    const strongs = el.querySelectorAll("strong");
    strongs.forEach((s) => (s.style.fontSize = "12pt"));
  });

  // Sub-sections and content - all 10pt
  const subSections = element.querySelectorAll(
    ".sub-section h6, .document-content"
  );
  subSections.forEach((el) => {
    el.style.fontSize = "10pt";
    const strongs = el.querySelectorAll("strong");
    strongs.forEach((s) => (s.style.fontSize = "10pt"));
  });
}

function debugOptionValues() {
  console.log("=== DEBUGGING OPTIONS ===");
  const flatDoc = flattenObject(window.currentDocument);

  Object.keys(flatDoc).forEach((key) => {
    if (key.includes("options") && Array.isArray(flatDoc[key])) {
      // Find the parent path
      const parentPath = key.substring(0, key.lastIndexOf("."));

      // Check for different selection keys
      const selectedKey = `${parentPath}.selected`;
      const selected1Key = `${parentPath}.selected1`;
      const selected2Key = `${parentPath}.selected2`;

      console.log(`Options at ${key}:`);
      console.log(`- Values: ${flatDoc[key].join(" | ")}`);
      console.log(`- Selected: ${flatDoc[selectedKey] || "(none)"}`);
      console.log(`- Selected1: ${flatDoc[selected1Key] || "(none)"}`);
      console.log(`- Selected2: ${flatDoc[selected2Key] || "(none)"}`);
    }
  });
}
function downloadWordDocx() {
  // Clone the content to avoid modifying the original
  const previewElem = document.getElementById("documentPreview");
  const contentClone = previewElem.cloneNode(true);

  // Clean up content before converting
  cleanupForDocx(contentClone);

  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Document</title>
            <style>
                @page {
                    margin: 1in;
                }
                body {
                    font-family: Verdana, sans-serif;
                    font-size: 10pt;
                    line-height: 1.3;
                    color: #000;
                }
                
                /* Document title */
                .document-title {
                    font-size: 14pt;
                    font-weight: bold;
                    margin-bottom: 24pt;
                }
                .document-title strong {
                    font-size: 14pt;
                }
                
                /* Main sections (DATE, PARTIES, etc.) */
                .main-section h5 {
                    font-size: 12pt;
                    font-weight: bold;
                    margin-top: 18pt;
                    margin-bottom: 12pt;
                    text-transform: uppercase;
                }
                .main-section h5 strong {
                    font-size: 12pt;
                }
                
                /* Sub-sections */
                .sub-section h6 {
                    font-size: 10pt;
                    font-weight: bold;
                    margin-top: 12pt;
                    margin-bottom: 6pt;
                }
                .sub-section h6 strong {
                    font-size: 10pt;
                }
                
                /* Content paragraphs */
                .document-content {
                    margin-bottom: 6pt;
                    font-size: 10pt;
                }
                
                /* Bold elements in content */
                .document-content strong {
                    font-size: 10pt;
                }
                
                /* Remove labels like "content:" */
                span[data-value-path] strong:first-child:after {
                    content: " ";
                }
                
                /* Legal clause spacing and indentation */
                .document-line {
                    margin-left: 0 !important;
                }
                
                /* Signature section typically comes near the end */
                .main-section:nth-last-of-type(2) {
                    margin-top: 24pt;
                }
                
                /* Schedule/appendix typically comes last */
                .main-section:last-of-type {
                    page-break-before: always;
                    margin-top: 0;
                }
                
                /* Remove unwanted elements and styling */
                .highlighted, .highlighted-section {
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border-left: none !important;
                    animation: none !important;
                }
                
                /* Additional spacing for signature blocks */
                [data-value-path*="signature"] {
                    margin-top: 12pt;
                    margin-bottom: 12pt;
                }
            </style>
        </head>
        <body>
            ${contentClone.innerHTML}
        </body>
        </html>
    `;

  const converted = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(converted);
  const link = document.createElement("a");
  link.href = url;
  link.download = "document.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function cleanupForDocx(element) {
  // 1. Remove any highlighting classes
  const highlighted = element.querySelectorAll(
    ".highlighted, .highlighted-section"
  );
  highlighted.forEach((el) => {
    el.classList.remove("highlighted");
    el.classList.remove("highlighted-section");
  });

  // 2. Fix heading format (remove ##### and other markdown-like symbols)
  const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
  headings.forEach((heading) => {
    heading.textContent = heading.textContent.replace(/^#+\s*/, "");
  });

  // 3. Remove labels like "content:", "option1:", etc.
  const spans = element.querySelectorAll("span[data-value-path]");
  spans.forEach((span) => {
    const text = span.textContent;
    const labelMatch = text.match(/^([a-zA-Z0-9]+):\s*(.*)/);
    if (
      labelMatch &&
      labelMatch[1] &&
      (labelMatch[1].toLowerCase() === "content" ||
        labelMatch[1].toLowerCase().includes("option"))
    ) {
      span.textContent = labelMatch[2];
    }
  });

  // 4. Set consistent margins and indentation
  const sections = element.querySelectorAll(".document-line");
  sections.forEach((section) => {
    section.style.marginLeft = "0";
  });

  // 5. Fix numbering format (add proper indentation for numbered clauses)
  const contentItems = element.querySelectorAll(".document-content");
  contentItems.forEach((item) => {
    // Check if this is a numbered clause (like "4.1:", "5.2:", etc.)
    const text = item.textContent;
    const numberMatch = text.match(/^(\d+\.\d+):\s*(.*)/);
    if (numberMatch) {
      item.style.paddingLeft = "0.25in";
      item.style.textIndent = "-0.25in";
    }
  });

  // 6. Apply consistent font sizes
  // Main title
  const titleElements = element.querySelectorAll(".document-title");
  titleElements.forEach((el) => {
    el.style.fontSize = "14pt";
    const strongs = el.querySelectorAll("strong");
    strongs.forEach((s) => (s.style.fontSize = "14pt"));
  });

  // Main sections
  const mainSections = element.querySelectorAll(".main-section h5");
  mainSections.forEach((el) => {
    el.style.fontSize = "12pt";
    const strongs = el.querySelectorAll("strong");
    strongs.forEach((s) => (s.style.fontSize = "12pt"));
  });

  // Sub-sections and content - all 10pt
  const subSections = element.querySelectorAll(
    ".sub-section h6, .document-content"
  );
  subSections.forEach((el) => {
    el.style.fontSize = "10pt";
    const strongs = el.querySelectorAll("strong");
    strongs.forEach((s) => (s.style.fontSize = "10pt"));
  });
}
