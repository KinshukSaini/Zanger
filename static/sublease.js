// Document order configuration
const sectionOrder = [
  "SUBLEASE AGREEMENT",
  "THE PARTIES",
  "PROPERTY",
  "LEASE PERIOD",
  "RENT",
  "FURNITURE",
  "APPLIANCES",
  "SECURITY DEPOSIT",
  "MOVE-IN INSPECTION",
  "PRE-PAYMENT OF RENT",
  "LATE RENT",
  "UTILITIES & SERVICES",
  "PARKING",
  "PETS",
  "SMOKING POLICY",
  "LANDLORD'S CONSENT",
  "NOTICES",
  "SUBLETTING",
  "LEAD-BASED PAINT",
  "LIABILITY",
  "GUESTS",
  "MASTER LEASE",
  "DISPUTES",
  "WRITTEN AGREEMENT",
  "GOVERNING LAW",
  "ADDITIONAL TERMS & CONDITIONS",
  "SEVERABILITY",
  "ENTIRE AGREEMENT",
  "SIGNATURES",
];

const assignmentSectionOrder = [
  "THE PARTIES",
  "PROPERTY",
  "LEASE PERIOD",
  "RENT",
  "FURNITURE",
  "APPLIANCES",
  "SECURITY DEPOSIT",
  "MOVE-IN INSPECTION",
  "PRE-PAYMENT OF RENT",
  "LATE RENT",
  "UTILITIES & SERVICES",
  "PARKING",
  "PETS",
  "SMOKING POLICY",
  "LANDLORD'S CONSENT",
  "NOTICES",
  "SUBLETTING",
  "LEAD-BASED PAINT",
  "LIABILITY",
  "GUESTS",
  "MASTER LEASE",
  "DISPUTES",
  "WRITTEN AGREEMENT",
  "GOVERNING LAW",
  "ADDITIONAL TERMS & CONDITIONS",
  "SEVERABILITY",
  "ENTIRE AGREEMENT",
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
    const keys = key.split(".");
    let current = result;

    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        current[k] = value;
      } else {
        // Always create an object, never an array
        if (!current[k] || typeof current[k] !== "object") {
          current[k] = {};
        }
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
// Predefined questions for document
const documentQuestions = {
  step1: {
    title: "Agreement Title & Parties",
    agreementTitle: { question: "Document Title", type: "text" },
    partiesContent: {
      question: "Parties Clause (intro text)",
      type: "textarea",
    },
    tenant: { question: "Tenant (name and address)", type: "text" },
    subtenant: { question: "Subtenant (name and address)", type: "text" },
    occupants: { question: "Occupant(s) (names)", type: "text" },
  },
  step2: {
    title: "Property Details",
    propertyContent: {
      question: "Property Clause (intro text)",
      type: "textarea",
    },
    address: { question: "Property Address", type: "text" },
    propertyType: { question: "Type of Property", type: "text" },
    bedrooms: { question: "Number of Bedrooms", type: "number" },
    bathrooms: { question: "Number of Bathrooms", type: "number" },
  },
  step3: {
    title: "Lease Period",
    leasePeriodContent: {
      question: "Lease Period Clause (intro text)",
      type: "textarea",
    },
    startDate: { question: "Lease Start Date", type: "date" },
    endDate: { question: "Lease End Date", type: "date" },
    leaseNote: { question: "Lease Note", type: "textarea" },
  },
  step4: {
    title: "Rent",
    rentContent: { question: "Rent Clause (intro text)", type: "textarea" },
    monthlyRent: { question: "Monthly Rent Amount", type: "text" },
    dueDate: { question: "Rent Due Date", type: "text" },
    paymentInstructions: { question: "Payment Instructions", type: "textarea" },
  },
  step5: {
    title: "Furniture",
    furnitureContent: {
      question: "Furniture Clause (intro text)",
      type: "textarea",
    },
    furnitureOption: {
      question: "Select furniture status",
      type: "select",
      options: [
        "Property is Not Furnished",
        "Property is Furnished (describe below)",
      ],
    },
    furnitureDescription: {
      question: "If furnished, describe the furnishings",
      type: "textarea",
      showIf: "furnitureOption=1",
    },
  },
  step6: {
    title: "Appliances",
    appliancesContent: {
      question: "Appliances Clause (intro text)",
      type: "textarea",
    },
    appliancesOption: {
      question: "Select appliances status",
      type: "select",
      options: [
        "Property Has No Appliances",
        "Property Has Appliances (select below)",
      ],
    },
    appliancesList: {
      question: "List all appliances provided",
      type: "textarea",
      showIf: "appliancesOption=1",
    },
  },
  step7: {
    title: "Security Deposit",
    securityDepositContent: {
      question: "Security Deposit Clause (intro text)",
      type: "textarea",
    },
    securityDepositOption: {
      question: "Select security deposit status",
      type: "select",
      options: ["No Security Deposit", "Security Deposit Required"],
    },
    securityDepositAmount: {
      question: "If required, enter deposit clause/amount",
      type: "textarea",
      showIf: "securityDepositOption=1",
    },
  },
  step8: {
    title: "Move-In Inspection",
    moveInInspectionContent: {
      question: "Move-In Inspection Clause (intro text)",
      type: "textarea",
    },
    moveInInspectionOption: {
      question: "Select move-in inspection status",
      type: "select",
      options: ["No Move-In Inspection", "Move-In Inspection Required"],
    },
    moveInInspectionDescription: {
      question: "If required, enter inspection clause",
      type: "textarea",
      showIf: "moveInInspectionOption=1",
    },
  },
  step9: {
    title: "Pre-Payment of Rent",
    prePaymentContent: {
      question: "Pre-Payment Clause (intro text)",
      type: "textarea",
    },
    prePaymentOption: {
      question: "Select pre-payment status",
      type: "select",
      options: ["No Pre-Payment Required", "Pre-Payment Required"],
    },
    prePaymentAmount: {
      question: "Pre-Payment Amount",
      type: "text",
      showIf: "prePaymentOption=1",
    },
    prePaymentPeriodStart: {
      question: "Pre-Payment Period Start Date",
      type: "date",
      showIf: "prePaymentOption=1",
    },
    prePaymentPeriodEnd: {
      question: "Pre-Payment Period End Date",
      type: "date",
      showIf: "prePaymentOption=1",
    },
  },
  step10: {
    title: "Late Rent",
    lateRentContent: {
      question: "Late Rent Clause (intro text)",
      type: "textarea",
    },
    lateRentOption: {
      question: "Select late rent status",
      type: "select",
      options: ["No Late Fee", "Late Fee (choose type below)"],
    },
    lateFeeType: {
      question: "Late Fee Type",
      type: "select",
      options: ["Fixed Amount", "Interest"],
      showIf: "lateRentOption=1",
    },
    lateFeeFixed: {
      question: "Fixed Amount Clause",
      type: "text",
      showIf: "lateFeeType=0",
    },
    lateFeeInterest: {
      question: "Interest Clause",
      type: "text",
      showIf: "lateFeeType=1",
    },
  },
  step11: {
    title: "Utilities & Services",
    utilitiesContent: {
      question: "Utilities & Services Clause (intro text)",
      type: "textarea",
    },
    utilitiesOption: {
      question: "Select utilities status",
      type: "select",
      options: [
        "Tenant Pays None",
        "Tenant Pays for Some",
        "Tenant Pays for All",
      ],
    },
    utilitiesDescription: {
      question: "If some, describe utilities/services paid by Tenant",
      type: "textarea",
      showIf: "utilitiesOption=1",
    },
  },
  step12: {
    title: "Parking",
    parkingContent: {
      question: "Parking Clause (intro text)",
      type: "textarea",
    },
    parkingOption: {
      question: "Select parking status",
      type: "select",
      options: [
        "No Parking Provided",
        "Parking Provided (choose fee option below)",
      ],
    },
    parkingSpaces: {
      question: "Number of parking spaces (if provided)",
      type: "text",
      showIf: "parkingOption=1",
    },
    parkingFeeOption: {
      question: "Parking Fee Option",
      type: "select",
      options: ["No Fee", "Fee (describe below)"],
      showIf: "parkingOption=1",
    },
    parkingFeeDescription: {
      question: "Parking Fee Description",
      type: "textarea",
      showIf: "parkingOption=1",
    },
  },
  step13: {
    title: "Pets",
    petsContent: { question: "Pets Clause (intro text)", type: "textarea" },
    petsOption: {
      question: "Select pets status",
      type: "select",
      options: ["No Pets Allowed", "Pets Allowed (describe below)"],
    },
    petsNumber: {
      question: "Number of Pets Allowed",
      type: "number",
      showIf: "petsOption=1",
    },
    petsTypes: {
      question: "Types of Pets Allowed",
      type: "text",
      showIf: "petsOption=1",
    },
    petsWeight: {
      question: "Maximum Weight per Pet",
      type: "text",
      showIf: "petsOption=1",
    },
    petsDeposit: {
      question: "Pet Deposit Clause",
      type: "text",
      showIf: "petsOption=1",
    },
  },
  step14: {
    title: "Smoking Policy",
    smokingContent: {
      question: "Smoking Policy Clause (intro text)",
      type: "textarea",
    },
    smokingOption: {
      question: "Select smoking policy",
      type: "select",
      options: ["Smoking Not Allowed", "Smoking Allowed (choose area below)"],
    },
    smokingArea: {
      question: "Smoking Area Option",
      type: "select",
      options: ["In All Areas", "Specific Areas (describe below)"],
      showIf: "smokingOption=1",
    },
    smokingAreaDescription: {
      question: "Describe Smoking Areas",
      type: "textarea",
      showIf: "smokingArea=1",
    },
  },
  step15: {
    title: "Landlord's Consent",
    landlordConsentContent: {
      question: "Landlord's Consent Clause (intro text)",
      type: "textarea",
    },
    landlordConsentOption: {
      question: "Select landlord consent status",
      type: "select",
      options: ["Tenant Has Consent", "Tenant Does Not Have Consent"],
    },
    landlordConsentDescription: {
      question: "If no consent, describe clause",
      type: "textarea",
      showIf: "landlordConsentOption=1",
    },
  },
  step16: {
    title: "Notices",
    noticesContent: {
      question: "Notices Clause (intro text)",
      type: "textarea",
    },
    tenantNoticeOption: {
      question: "Tenant Notice Option",
      type: "select",
      options: [
        "The address mentioned in Section 1",
        "Custom Tenant Notice Address",
      ],
    },
    tenantNoticeAddress: {
      question: "Tenant Notice Address",
      type: "text",
      showIf: "tenantNoticeOption=1",
    },
    subtenantNoticeOption: {
      question: "Subtenant Notice Option",
      type: "select",
      options: [
        "The address of the property",
        "Custom Subtenant Notice Address",
      ],
    },
    subtenantNoticeAddress: {
      question: "Subtenant Notice Address",
      type: "text",
      showIf: "subtenantNoticeOption=1",
    },
  },
  step17: {
    title: "Subletting",
    sublettingContent: {
      question: "Subletting Clause (intro text)",
      type: "textarea",
    },
    sublettingOption: {
      question: "Select subletting status",
      type: "select",
      options: ["No Subletting Allowed", "Subletting is Allowed"],
    },
  },
  step18: {
    title: "Lead-Based Paint",
    leadPaintContent: {
      question: "Lead-Based Paint Clause (intro text)",
      type: "textarea",
    },
    leadPaintOption: {
      question: "Select lead-based paint status",
      type: "select",
      options: ["No Lead-Based Paint", "Lead-Based Paint Disclosures"],
    },
  },
  step19: {
    title: "Liability",
    liabilityContent: { question: "Liability Clause", type: "textarea" },
  },
  step20: {
    title: "Guests",
    guestsContent: { question: "Guests Clause", type: "textarea" },
  },
  step21: {
    title: "Master Lease",
    masterLeaseContent: { question: "Master Lease Clause", type: "textarea" },
  },
  step22: {
    title: "Disputes",
    disputesContent: { question: "Disputes Clause", type: "textarea" },
  },
  step23: {
    title: "Written Agreement",
    writtenAgreementContent: {
      question: "Written Agreement Clause",
      type: "textarea",
    },
  },
  step24: {
    title: "Governing Law",
    governingLawContent: { question: "Governing Law Clause", type: "textarea" },
  },
  step25: {
    title: "Additional Terms & Conditions",
    additionalTermsContent: {
      question: "Additional Terms & Conditions",
      type: "textarea",
    },
  },
  step26: {
    title: "Severability",
    severabilityContent: { question: "Severability Clause", type: "textarea" },
  },
  step27: {
    title: "Entire Agreement",
    entireAgreementContent: {
      question: "Entire Agreement Clause",
      type: "textarea",
    },
  },
  step28: {
    title: "Signatures",
    tenantSignature: { question: "Tenant Signature Line", type: "text" },
    tenantName: { question: "Tenant Print Name", type: "text" },
    subtenant1Signature: {
      question: "Subtenant 1 Signature Line",
      type: "text",
    },
    subtenant1Name: { question: "Subtenant 1 Print Name", type: "text" },
    subtenant2Signature: {
      question: "Subtenant 2 Signature Line",
      type: "text",
    },
    subtenant2Name: { question: "Subtenant 2 Print Name", type: "text" },
  },
};

const documentPathMap = {
  agreementTitle: ["Sublease Agreement.SUBLEASE AGREEMENT.content"],
  partiesContent: ["Sublease Agreement.THE PARTIES.1.content"],
  tenant: ["Sublease Agreement.THE PARTIES.1.tenant"],
  subtenant: ["Sublease Agreement.THE PARTIES.1.subtenant"],
  occupants: ["Sublease Agreement.THE PARTIES.1.occupants"],
  propertyContent: ["Sublease Agreement.PROPERTY.2.content"],
  address: ["Sublease Agreement.PROPERTY.2.address"],
  propertyType: ["Sublease Agreement.PROPERTY.2.type.content"],
  bedrooms: ["Sublease Agreement.PROPERTY.2.rooms.bedrooms"],
  bathrooms: ["Sublease Agreement.PROPERTY.2.rooms.bathrooms"],
  leasePeriodContent: ["Sublease Agreement.LEASE PERIOD.3.content"],
  startDate: ["Sublease Agreement.LEASE PERIOD.3.start_date"],
  endDate: ["Sublease Agreement.LEASE PERIOD.3.end_date"],
  leaseNote: ["Sublease Agreement.LEASE PERIOD.3.note"],
  rentContent: ["Sublease Agreement.RENT.4.content"],
  monthlyRent: ["Sublease Agreement.RENT.4.monthly_rent"],
  dueDate: ["Sublease Agreement.RENT.4.due_date"],
  paymentInstructions: ["Sublease Agreement.RENT.4.payment_instructions"],
  furnitureContent: ["Sublease Agreement.FURNITURE.5.content"],
  furnitureOption: ["Sublease Agreement.FURNITURE.5.selectedOption"],
  furnitureDescription: ["Sublease Agreement.FURNITURE.5.options.1.option"],
  appliancesContent: ["Sublease Agreement.APPLIANCES.6.content"],
  appliancesOption: ["Sublease Agreement.APPLIANCES.6.selectedOption"],
  appliancesList: ["Sublease Agreement.APPLIANCES.6.options.1.appliances"],
  securityDepositContent: ["Sublease Agreement.SECURITY DEPOSIT.7.content"],
  securityDepositOption: [
    "Sublease Agreement.SECURITY DEPOSIT.7.selectedOption",
  ],
  securityDepositAmount: [
    "Sublease Agreement.SECURITY DEPOSIT.7.options.1.option",
  ],
  moveInInspectionContent: ["Sublease Agreement.MOVE-IN INSPECTION.8.content"],
  moveInInspectionOption: [
    "Sublease Agreement.MOVE-IN INSPECTION.8.selectedOption",
  ],
  moveInInspectionDescription: [
    "Sublease Agreement.MOVE-IN INSPECTION.8.options.1.option",
  ],
  prePaymentContent: ["Sublease Agreement.PRE-PAYMENT OF RENT.9.content"],
  prePaymentOption: ["Sublease Agreement.PRE-PAYMENT OF RENT.9.selectedOption"],
  prePaymentAmount: [
    "Sublease Agreement.PRE-PAYMENT OF RENT.9.options.1.details.amount",
  ],
  prePaymentPeriodStart: [
    "Sublease Agreement.PRE-PAYMENT OF RENT.9.options.1.details.period.start",
  ],
  prePaymentPeriodEnd: [
    "Sublease Agreement.PRE-PAYMENT OF RENT.9.options.1.details.period.end",
  ],
  lateRentContent: ["Sublease Agreement.LATE RENT.10.content"],
  lateRentOption: ["Sublease Agreement.LATE RENT.10.selectedOption"],
  lateFeeType: ["Sublease Agreement.LATE RENT.10.options.1.selectedFeeType"],
  lateFeeFixed: [
    "Sublease Agreement.LATE RENT.10.options.1.fee_types.0.option",
  ],
  lateFeeInterest: [
    "Sublease Agreement.LATE RENT.10.options.1.fee_types.1.option",
  ],
  utilitiesContent: ["Sublease Agreement.UTILITIES & SERVICES.11.content"],
  utilitiesOption: [
    "Sublease Agreement.UTILITIES & SERVICES.11.selectedOption",
  ],
  utilitiesDescription: [
    "Sublease Agreement.UTILITIES & SERVICES.11.options.1.option",
  ],
  parkingContent: ["Sublease Agreement.PARKING.12.content"],
  parkingOption: ["Sublease Agreement.PARKING.12.selectedOption"],
  parkingSpaces: ["Sublease Agreement.PARKING.12.options.1.spaces"],
  parkingFeeOption: [
    "Sublease Agreement.PARKING.12.options.1.selectedFeeOption",
  ],
  parkingFeeDescription: [
    "Sublease Agreement.PARKING.12.options.1.fee_options.1.option",
  ],
  petsContent: ["Sublease Agreement.PETS.13.content"],
  petsOption: ["Sublease Agreement.PETS.13.selectedOption"],
  petsNumber: ["Sublease Agreement.PETS.13.options.1.details.number"],
  petsTypes: ["Sublease Agreement.PETS.13.options.1.details.types"],
  petsWeight: ["Sublease Agreement.PETS.13.options.1.details.weight"],
  petsDeposit: ["Sublease Agreement.PETS.13.options.1.details.deposit"],
  smokingContent: ["Sublease Agreement.SMOKING POLICY.14.content"],
  smokingOption: ["Sublease Agreement.SMOKING POLICY.14.selectedOption"],
  smokingArea: ["Sublease Agreement.SMOKING POLICY.14.options.1.selectedArea"],
  smokingAreaDescription: [
    "Sublease Agreement.SMOKING POLICY.14.options.1.allowed_areas.1.option",
  ],
  landlordConsentContent: ["Sublease Agreement.LANDLORD'S CONSENT.15.content"],
  landlordConsentOption: [
    "Sublease Agreement.LANDLORD'S CONSENT.15.selectedOption",
  ],
  landlordConsentDescription: [
    "Sublease Agreement.LANDLORD'S CONSENT.15.options.1.option",
  ],
  noticesContent: ["Sublease Agreement.NOTICES.16.content"],
  tenantNoticeOption: [
    "Sublease Agreement.NOTICES.16.tenant_notice.selectedOption",
  ],
  tenantNoticeAddress: [
    "Sublease Agreement.NOTICES.16.tenant_notice.options.1.option",
  ],
  subtenantNoticeOption: [
    "Sublease Agreement.NOTICES.16.subtenant_notice.selectedOption",
  ],
  subtenantNoticeAddress: [
    "Sublease Agreement.NOTICES.16.subtenant_notice.options.1.option",
  ],
  sublettingContent: ["Sublease Agreement.SUBLETTING.17.content"],
  sublettingOption: ["Sublease Agreement.SUBLETTING.17.selectedOption"],
  leadPaintContent: ["Sublease Agreement.LEAD-BASED PAINT.18.content"],
  leadPaintOption: ["Sublease Agreement.LEAD-BASED PAINT.18.selectedOption"],
  liabilityContent: ["Sublease Agreement.LIABILITY.19.content"],
  guestsContent: ["Sublease Agreement.GUESTS.20.content"],
  masterLeaseContent: ["Sublease Agreement.MASTER LEASE.21.content"],
  disputesContent: ["Sublease Agreement.DISPUTES.22.content"],
  writtenAgreementContent: ["Sublease Agreement.WRITTEN AGREEMENT.23.content"],
  governingLawContent: ["Sublease Agreement.GOVERNING LAW.24.content"],
  additionalTermsContent: [
    "Sublease Agreement.ADDITIONAL TERMS & CONDITIONS.25.content",
  ],
  severabilityContent: ["Sublease Agreement.SEVERABILITY.26.content"],
  entireAgreementContent: ["Sublease Agreement.ENTIRE AGREEMENT.27.content"],
  tenantSignature: [
    "Sublease Agreement.SIGNATURES.signature_blocks.tenant.signature",
  ],
  tenantName: ["Sublease Agreement.SIGNATURES.signature_blocks.tenant.name"],
  subtenant1Signature: [
    "Sublease Agreement.SIGNATURES.signature_blocks.subtenant1.signature",
  ],
  subtenant1Name: [
    "Sublease Agreement.SIGNATURES.signature_blocks.subtenant1.name",
  ],
  subtenant2Signature: [
    "Sublease Agreement.SIGNATURES.signature_blocks.subtenant2.signature",
  ],
  subtenant2Name: [
    "Sublease Agreement.SIGNATURES.signature_blocks.subtenant2.name",
  ],
};

/**gi
 * Highlights document sections affected by a specific form field
 * and scrolls to the highlighted element after a brief delay
 * @param {string} fieldId - The ID of the form field being focused
 */
function highlightDocumentSection(fieldId) {
  clearHighlights();

  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;

  const previewElem = document.getElementById("documentPreview");
  let found = false;

  paths.forEach((path) => {
    // Try direct match first
    let elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);
    if (elements.length > 0) {
      elements.forEach((elem) => elem.classList.add("highlighted"));
      found = true;
      return;
    }

    // Handle select/options fields
    if (path.endsWith(".selectedOption")) {
      let selectedIndex = formDataStore[fieldId];
      if (selectedIndex !== undefined && selectedIndex !== "") {
        // Always cast to number for path
        selectedIndex = Number(selectedIndex);
        const optionContentPath = path.replace(
          /\.selectedOption$/,
          `.options.${selectedIndex}.option`
        );
        elements = previewElem.querySelectorAll(
          `[data-value-path="${optionContentPath}"]`
        );
        if (elements.length > 0) {
          elements.forEach((elem) => elem.classList.add("highlighted"));
          found = true;
          return;
        }
      }
    }

    // Fallback: Try parent section if exact path not found
    const basePathParts = path.split(".");
    basePathParts.pop();
    const basePath = basePathParts.join(".");
    const parentElements = previewElem.querySelectorAll(
      `[data-path="${basePath}"]`
    );
    parentElements.forEach((elem) => elem.classList.add("highlighted-section"));
    if (parentElements.length > 0) found = true;
  });

  setTimeout(() => {
    // Only scroll inside the preview panel
    const firstHighlighted = previewElem.querySelector(
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

// Store form data between steps
let formDataStore = {};

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");

  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Sublease Agreement": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    // Build questionnaire and preview
    showQuestionnaire();
    updatePreview();

    // Safely register highlight events once preview is in DOM
    setTimeout(() => {
      const previewElem = document.getElementById("documentPreview");
      if (previewElem) {
        previewElem.addEventListener("mouseup", handleTextSelection);
        previewElem.addEventListener("keyup", handleTextSelection);
        registerHighlightEvents();
      } else {
        console.warn(
          "No #documentPreview element—skipping selection/highlight setup"
        );
      }
    }, 500);

    // Wire up AI Edit dialog only if button exists
    const aiSubmit = document.getElementById("submit-ai-edit");
    if (aiSubmit) {
      aiSubmit.addEventListener("click", submitAIEditRequest);
    } else {
      console.warn("No #submit-ai-edit button found—AI editing disabled");
    }

    console.log("Document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Convert document object to HTML for preview
// Updated convertToHtml to use documentQuestions and documentPathMap

/**
 * Safely retrieves a nested value from an object using a dot-separated path.
 */
function getValue(obj, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    // handle array indices
    const arrayIndexMatch = key.match(/(\w+)\[(\d+)\]/);
    if (arrayIndexMatch) {
      const [, prop, idx] = arrayIndexMatch;
      return acc[prop] && acc[prop][parseInt(idx, 10)];
    }
    return acc[key];
  }, obj);
}

/**
 * Converts a document JSON and its questionnaire config into HTML.
 */
// 1. Add this helper function near the top of your file (before convertToHtml):

/**
 * Replace [placeholders] in text with values from formDataStore.
 * If no value is found, keep the placeholder.
 */
function replacePlaceholders(text, formData) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/\[([^\]]+)\]/g, (match, key) => {
    // Try to find a matching field in formData (case-insensitive)
    const foundKey = Object.keys(formData).find(
      (k) => k.toLowerCase() === key.trim().toLowerCase()
    );
    return foundKey && formData[foundKey] ? formData[foundKey] : match;
  });
}

// 2. Update your convertToHtml function to use replacePlaceholders
//    wherever you output document content (e.g., subValue, selected.option, etc.)
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];
  if (documentTitle) {
    html.push(
      `<div class="document-title"><strong>${documentTitle}</strong></div>`
    );
    const mainContent = document[documentTitle];

    // --- START: Handle DATE section separately ---
    if (mainContent["DATE"]) {
      const dateValue = mainContent["DATE"];
      const datePath = `${documentTitle}.DATE`;
      html.push(
        `<div class="document-line main-section" data-path="${datePath}" style="margin-left: 0px;">
            <h5><strong>DATE</strong></h5>
        </div>`
      );
      if (
        typeof dateValue === "object" &&
        dateValue !== null &&
        dateValue.content !== undefined
      ) {
        const contentPath = `${datePath}.content`;
        html.push(
          `<div class="document-line document-content" data-path="${contentPath}" style="margin-left: 40px;">
            <span data-value-path="${contentPath}">
                ${replacePlaceholders(dateValue.content, formDataStore)}
            </span>
          </div>`
        );
      }
    }
    // --- END: Handle DATE section separately ---

    sectionOrder
      .filter((section) => section !== "DATE")
      .forEach((section) => {
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

    // Section header
    if (isMainSection) {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
      <h5><strong>${key}</strong></h5>
    </div>`
      );
    } else if (level > 0 && isNaN(Number(key))) {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
      <h6><strong>${key}</strong></h6>
    </div>`
      );
    }

    // Only show selected option for options arrays
    if (
      typeof value === "object" &&
      value !== null &&
      Array.isArray(value.options) &&
      typeof value.selectedOption === "number"
    ) {
      const idx = value.selectedOption;
      const selected = value.options[idx];
      if (selected) {
        const optionPath = `${currentPath}.options.${idx}.option`;
        html.push(
          `<div class="document-line document-content" data-path="${currentPath}.options.${idx}" style="margin-left: ${
            marginLeft + 20
          }px;">
        <span data-value-path="${optionPath}">${replacePlaceholders(
            selected.option || "",
            formDataStore
          )}</span>
      </div>`
        );
        Object.keys(selected).forEach((k) => {
          if (k !== "option" && typeof selected[k] === "string") {
            const kSnake = toSnakeCase(k);
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.options.${idx}.${kSnake}" style="margin-left: ${
                marginLeft + 40
              }px;">
            <span data-value-path="${currentPath}.options.${idx}.${kSnake}">${replacePlaceholders(
                selected[k],
                formDataStore
              )}</span>
          </div>`
            );
          }
        });
      }
      return;
    }

    if (typeof value === "object" && value !== null) {
      let keys = Object.keys(value);

      keys.forEach((subKey) => {
        const subValue = value[subKey];
        const subKeySnake = toSnakeCase(subKey);
        const subMarginLeft = marginLeft + 20;

        if (typeof subValue === "string") {
          if (subKey === "content") {
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKeySnake}" style="margin-left: ${subMarginLeft}px;">
            <span data-value-path="${currentPath}.${subKeySnake}">${replacePlaceholders(
                subValue,
                formDataStore
              )}</span>
          </div>`
            );
          } else if (!/^\d+$/.test(subKey)) {
            // Not a numeric key: render as label + value
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKeySnake}" style="margin-left: ${subMarginLeft}px;">
            <span data-value-path="${currentPath}.${subKeySnake}"><strong>${subKeySnake.replace(
                /_/g,
                " "
              )}</strong>: ${replacePlaceholders(
                subValue,
                formDataStore
              )}</span>
          </div>`
            );
          } else {
            // Numeric key: treat as group/section label, not as a numbered list
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKeySnake}" style="margin-left: ${subMarginLeft}px;">
            <span data-value-path="${currentPath}.${subKeySnake}"><strong>${replacePlaceholders(
                subValue,
                formDataStore
              )}</strong></span>
          </div>`
            );
          }
        } else if (Array.isArray(subValue)) {
          if (subValue.length > 0) {
            html.push(
              `<ul class="document-list" style="margin-left: ${
                subMarginLeft + 20
              }px;">`
            );
            subValue.forEach((item) => {
              if (typeof item === "string") {
                html.push(
                  `<li>${replacePlaceholders(item, formDataStore)}</li>`
                );
              } else if (typeof item === "object") {
                if (item.option) {
                  html.push(
                    `<li><strong>${replacePlaceholders(
                      item.option,
                      formDataStore
                    )}</strong></li>`
                  );
                  Object.keys(item).forEach((k) => {
                    if (k !== "option") {
                      const kSnake = toSnakeCase(k);
                      if (Array.isArray(item[k])) {
                        html.push(`<ul style="margin-left: 20px;">`);
                        item[k].forEach((subitem) => {
                          if (typeof subitem === "string") {
                            html.push(
                              `<li>${replacePlaceholders(
                                subitem,
                                formDataStore
                              )}</li>`
                            );
                          } else if (
                            typeof subitem === "object" &&
                            subitem.option
                          ) {
                            html.push(
                              `<li><strong>${replacePlaceholders(
                                subitem.option,
                                formDataStore
                              )}</strong></li>`
                            );
                          }
                        });
                        html.push(`</ul>`);
                      } else if (typeof item[k] === "object") {
                        Object.keys(item[k]).forEach((subk) => {
                          const subkSnake = toSnakeCase(subk);
                          html.push(
                            `<li><strong>${subkSnake.replace(
                              /_/g,
                              " "
                            )}:</strong> ${replacePlaceholders(
                              item[k][subk],
                              formDataStore
                            )}</li>`
                          );
                        });
                      } else if (typeof item[k] === "string") {
                        html.push(
                          `<li><strong>${kSnake.replace(
                            /_/g,
                            " "
                          )}:</strong> ${replacePlaceholders(
                            item[k],
                            formDataStore
                          )}</li>`
                        );
                      }
                    }
                  });
                } else {
                  Object.keys(item).forEach((k) => {
                    const kSnake = toSnakeCase(k);
                    html.push(
                      `<li><strong>${kSnake.replace(
                        /_/g,
                        " "
                      )}:</strong> ${replacePlaceholders(
                        item[k],
                        formDataStore
                      )}</li>`
                    );
                  });
                }
              }
            });
            html.push(`</ul>`);
          }
        } else if (subValue && typeof subValue === "object") {
          processSection(subKey, subValue, level + 1, currentPath);
        }
      });
    }
  }
}
// Save selection for inserted content
let savedRange = null;
const previewElem = document.getElementById("documentPreview");
if (previewElem) {
  previewElem.addEventListener("mouseup", saveSelection);
  previewElem.addEventListener("keyup", saveSelection);
}

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

function showQuestionnaire() {
  // Get the right panel container instead of modal
  const container = document.getElementById("keyContainer");

  // DON'T modify the heading if there's already a save button
  const panelHeading = container.parentElement.querySelector("h2");
  const existingSaveButton =
    container.parentElement.querySelector("#saveDocBtn");

  // Clear existing content
  container.innerHTML = "";

  // Create all steps at once in the container
  let allQuestionsHTML = "";
  // Render ALL steps in documentQuestions
  Object.keys(documentQuestions).forEach((stepKey) => {
    const stepData = documentQuestions[stepKey];
    allQuestionsHTML += `
      <div class="questionnaire-section">
        <h3>${stepData.title}</h3>
        <div class="step-content">
          ${createQuestionsHTML(stepData)}
        </div>
      </div>
    `;
  });

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

        // For party type dropdowns, handle specially
        if (this.id === "assignorType" || this.id === "assigneeType") {
          handlePartyTypeChange(this);
        } else if (this.id === "considerationType") {
          handleConsiderationTypeChange(this);
        } else if (this.tagName === "SELECT") {
          handleFieldChange(this);
        } else {
          // Update document in real-time for other inputs
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Restore all saved form data for all steps
  Object.keys(documentQuestions).forEach((stepKey) => {
    restoreStepData(stepKey);
    registerHighlightEvents();
  });
}

// Save selection for inserted content

if (previewElem) {
  previewElem.addEventListener("mouseup", saveSelection);
  previewElem.addEventListener("keyup", saveSelection);
}

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
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

function createQuestionsHTML(stepData) {
  let html = "";

  // Add section identifier classes
  const isAssignorSection =
    stepData.title && stepData.title.includes("Assignor");
  const isAssigneeSection =
    stepData.title && stepData.title.includes("Assignee");
  const sectionClass = isAssignorSection
    ? "assignor-section"
    : isAssigneeSection
    ? "assignee-section"
    : "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions - add section class
      const groupClass = isAssignorSection
        ? "assignor-group"
        : isAssigneeSection
        ? "assignee-group"
        : "";

      html += `<div class="question-group ${groupClass}" id="${key}-group">`;
      html += createQuestionsHTML(data);
      html += "</div>";
    } else {
      // This is a single question
      html += createQuestionField(key, data, sectionClass);
    }
  }
  return html;
}

function createQuestionField(key, data, sectionClass = "") {
  if (!data.question) return ""; // Skip if no question

  let visibilityAttr = "";
  if (data.showIf) {
    const [condition, value] = data.showIf.split("=");
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}" style="display: none;"`;
  }

  return `
    <div class="question-field ${sectionClass}" ${visibilityAttr}>
      <label>${data.question}</label>
      ${createInputElement(key, data)}
    </div>
  `;
}

function createInputElement(key, data) {
  // Only use prefix for party/consideration types
  let prefix = "";

  // Extract context from showIf (for party/consideration types only)
  const dataShowIf = data.showIf || "";
  if (dataShowIf.includes("assignorType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `assignor_${type}_`;
  } else if (dataShowIf.includes("assigneeType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `assignee_${type}_`;
  } else if (
    key === "assignorType" ||
    key === "assigneeType" ||
    key === "considerationType"
  ) {
    prefix = "";
  }

  // For all standard fields, use just the key as ID
  const fullId =
    key === "assignorType" ||
    key === "assigneeType" ||
    key === "considerationType"
      ? key
      : prefix
      ? prefix + key
      : key;

  // For all sublease fields, prefix is always "" so fuQAllId === key

  // Get affected paths for data attributeA
  const affectedPaths = documentPathMap[fullId]
    ? `data-affects-path="${documentPathMap[fullId].join(",")}" `
    : "";

  // Handle special cases for the type selectors themselves
  if (key === "assignorType" || key === "assigneeType") {
    return `
      <select id="${key}" onchange="handlePartyTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (key === "considerationType") {
    return `
      <select id="${key}" onchange="handleConsiderationTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (data.type === "select") {
    // Use index as value for all other selects
    return `
      <select id="${key}" onchange="handleFieldChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt, idx) => `<option value="${idx}">${opt}</option>`)
          .join("")}
      </select>
    `;
  }

  // Create the appropriate input element
  switch (data.type) {
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" data-original-key="${key}" ${affectedPaths}>${
        data.default || ""
      }</textarea>`;
    case "date":
      return `<input type="date" id="${key}" data-original-key="${key}" ${affectedPaths}>`;
    default:
      return `<input type="text" id="${key}" data-original-key="${key}" value="${
        data.default || ""
      }" ${affectedPaths}>`;
  }
}

function handleConsiderationTypeChange(selectElement) {
  // Save the selected value
  formDataStore[selectElement.id] = selectElement.value;

  // Show/hide the appropriate field based on selection
  document
    .querySelectorAll(`[data-show-if="${selectElement.id}"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      field.style.display =
        showValue === selectElement.value ? "block" : "none";
    });

  // Update document with the selected consideration type
  updateDocumentWithFormData(formDataStore);
  updatePreview();

  // Highlight the affected sections
  highlightDocumentSection(selectElement.id);
}

function handleFieldChange(element) {
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

function saveStepData(stepNumber) {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && input.value) {
      formDataStore[input.id] = input.value;
    }
  });
}

function restoreStepData(stepNumber) {
  // Restore all saved values for this step
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // Handle conditional field visibility
      if (input.tagName === "SELECT") {
        // For party type selectors, use the specific handler
        if (input.id === "assignorType" || input.id === "assigneeType") {
          handlePartyTypeChange(input);
        } else if (input.id === "considerationType") {
          handleConsiderationTypeChange(input);
        } else {
          handleFieldChange(input);
        }
      }
    }
  });
}

function submitQuestionnaire() {
  try {
    // Update document with all collected data
    updateDocumentWithFormData(formDataStore);

    // Update UI
    updatePreview();

    // Show success message
    const successMessage = document.createElement("div");
    successMessage.className = "success";
    successMessage.textContent = "Document information saved successfully!";
    successMessage.style.position = "fixed";
    successMessage.style.bottom = "20px";
    successMessage.style.right = "20px";
    successMessage.style.padding = "10px 20px";
    document.body.appendChild(successMessage);

    // Remove message after 3 seconds
    setTimeout(() => {
      successMessage.remove();
    }, 3000);
  } catch (error) {
    console.error("Error submitting questionnaire:", error);
    alert("There was an error saving the document. Please try again.");
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "*[Date]*";
  // Assume dateStr is in format yyyy-mm-dd
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`; // DD-MM-YYYY
}

// Simplified handlePartyTypeChange function - no need to manually reset document
function handlePartyTypeChange(selectElement) {
  const isAssignor = selectElement.id === "assignorType";
  const isAssignee = selectElement.id === "assigneeType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isAssignor ? "assignor_" : "assignee_";
  const allPartyTypes = ["individual", "company", "partnership"];

  // Remove form data for other party types
  Object.keys(formDataStore).forEach((key) => {
    if (key.startsWith(prefix)) {
      const keyWithoutPrefix = key.substring(prefix.length);
      const matchesOtherType = allPartyTypes
        .filter((type) => type !== selectedType.toLowerCase())
        .some((type) => keyWithoutPrefix.startsWith(type));

      if (matchesOtherType) {
        delete formDataStore[key];
      }
    }
  });

  // Save the selected type
  formDataStore[selectElement.id] = selectedType;

  // Handle UI field visibility
  document
    .querySelectorAll(`[data-show-if="${selectElement.id}"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      field.style.display = showValue === selectedType ? "block" : "none";
    });

  // Update document with the current form data
  updateDocumentWithFormData(formDataStore);
  updatePreview();

  // Add highlighting functionality
  // First, highlight the section affected by this dropdown
  highlightDocumentSection(selectElement.id);

  // Then focus on the first visible field for that party type
  // This will trigger additional highlighting for that field
  setTimeout(() => {
    // Find all visible input fields for this party type
    const visibleFields = document.querySelectorAll(
      `[data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) input, 
       [data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) textarea,
       [data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) select`
    );

    // Focus the first one if any exist
    if (visibleFields.length > 0) {
      visibleFields[0].focus();
    }
  }, 200); // Slight delay to ensure DOM is updated
}

/**
 * Maps form data to document structure
 * @param {Object} flatDoc - Flattened document object
 * @param {Object} formData - The form data
 * @return {Object} Updated flat document
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  // For each form field, update the corresponding path in flatDoc
  Object.keys(formData).forEach((fieldId) => {
    const paths = documentPathMap[fieldId];
    if (paths) {
      paths.forEach((path) => {
        if (flatDoc.hasOwnProperty(path)) {
          flatDoc[path] = formData[fieldId];
        }
      });
    }
  });
  return flatDoc;
}
// Main function for updating document with form data (using flatten/unflatten approach)
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

// Enable editing mode
function enableEditing() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) return;
  previewElem.contentEditable = true;
  previewElem.style.border = "1px dashed #aaa";
  document.getElementById("insertContentButton").style.display = "inline-block";
  document.getElementById("enableEditingButton").style.display = "none";
}

// Add this function near the enableEditing function

/**
 * Toggles the edit mode on and off for the document preview
 */
function toggleEditMode() {
  const previewElem = document.getElementById("documentPreview");
  const toggle = document.getElementById("editModeToggle");

  if (!previewElem) return;

  if (toggle.checked) {
    // Enable editing mode
    previewElem.contentEditable = true;
    previewElem.classList.add("editable");
    // Display a notification
    showNotification("Edit mode enabled");
  } else {
    // Disable editing mode
    previewElem.contentEditable = false;
    previewElem.classList.remove("editable");
    showNotification("Edit mode disabled");
  }
}

/**
 * Display a temporary notification message
 * @param {string} message - The message to display
 */
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

  // Remove the notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

/* --- Functions for Adding Key-Value Pair under ASSIGNMENT --- */
function openAddKeyValueDialog() {
  document.getElementById("addKeyValueDialog").style.display = "block";
  document.getElementById("newKVKey").focus();
}

function closeAddKeyValueDialog() {
  document.getElementById("addKeyValueDialog").style.display = "none";
  document.getElementById("keyContainer").focus();
}

function addKeyValuePair() {
  const key = document.getElementById("newKVKey").value.trim();
  const value = document.getElementById("newKVValue").value.trim();
  const errorDiv = document.getElementById("addDialogError");

  if (key === "" && value === "") {
    errorDiv.style.display = "block";
    errorDiv.textContent = "Please enter at least a key or a value.";
    return;
  } else {
    errorDiv.style.display = "none";
  }

  const documentTitle = Object.keys(window.currentDocument)[0];
  if (
    !window.currentDocument[documentTitle] ||
    !window.currentDocument[documentTitle]["ASSIGNMENT"]
  ) {
    if (!window.currentDocument[documentTitle]) {
      window.currentDocument[documentTitle] = {};
    }
    window.currentDocument[documentTitle]["ASSIGNMENT"] = {};
  }

  window.currentDocument[documentTitle]["ASSIGNMENT"][key] = { content: value };
  updatePreview();
  updateKeyEditor();

  document.getElementById("newKVKey").value = "";
  document.getElementById("newKVValue").value = "";
  closeAddKeyValueDialog();
}

// Functions for Adding Sub Key-Value Pair
function openAddSubKeyValueDialog() {
  const parentKeySelect = document.getElementById("parentKeySelect");
  parentKeySelect.innerHTML = "";

  const documentTitle = Object.keys(window.currentDocument)[0];
  if (
    window.currentDocument[documentTitle] &&
    window.currentDocument[documentTitle]["ASSIGNMENT"]
  ) {
    const assignmentObj = window.currentDocument[documentTitle]["ASSIGNMENT"];
    Object.keys(assignmentObj).forEach(function (key) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      parentKeySelect.appendChild(option);
    });
  }

  document.getElementById("addSubKeyValueDialog").style.display = "block";
}

function closeAddSubKeyValueDialog() {
  document.getElementById("addSubKeyValueDialog").style.display = "none";
  document.getElementById("keyContainer").focus();
}

function addSubKeyValuePair() {
  const parentKey = document.getElementById("parentKeySelect").value;
  const subKey = document.getElementById("subKey").value.trim();
  const subValue = document.getElementById("subValue").value.trim();
  const errorDiv = document.getElementById("subDialogError");

  if (!parentKey || subKey === "" || subValue === "") {
    errorDiv.style.display = "block";
    errorDiv.textContent =
      "Please select a parent and enter both sub key and sub value.";
    return;
  } else {
    errorDiv.style.display = "none";
  }

  const documentTitle = Object.keys(window.currentDocument)[0];
  if (
    !window.currentDocument[documentTitle] ||
    !window.currentDocument[documentTitle]["ASSIGNMENT"]
  ) {
    alert("ASSIGNMENT section does not exist.");
    return;
  }

  const assignmentObj = window.currentDocument[documentTitle]["ASSIGNMENT"];
  if (!assignmentObj[parentKey]) {
    assignmentObj[parentKey] = {};
  }

  assignmentObj[parentKey][subKey] = { content: subValue };
  updatePreview();
  updateKeyEditor();

  document.getElementById("subKey").value = "";
  document.getElementById("subValue").value = "";
  closeAddSubKeyValueDialog();
}

/* --- Get Ordered Paths for Key Editor --- */
function getOrderedPaths(obj) {
  let paths = [];
  const documentTitle = Object.keys(obj)[0];
  if (documentTitle) {
    const mainContent = obj[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSectionForPaths(
          mainContent[section],
          `${documentTitle}.${section}`
        );
      }
    });
  }

  function processSectionForPaths(section, currentPath) {
    if (!section || typeof section !== "object") return;

    let keys = Object.keys(section);
    if (currentPath.endsWith("ASSIGNMENT")) {
      const actualKeys = Object.keys(section);
      keys = assignmentSectionOrder
        .filter((k) => actualKeys.includes(k))
        .concat(actualKeys.filter((k) => !assignmentSectionOrder.includes(k)));
    }

    keys.forEach((key) => {
      const value = section[key];
      if (typeof value === "object" && value !== null) {
        if ("content" in value) {
          paths.push({
            path: `${currentPath}.${key}.content`,
            value: value.content,
          });
        } else {
          processSectionForPaths(value, `${currentPath}.${key}`);
        }
      } else if (typeof value === "string") {
        paths.push({ path: `${currentPath}.${key}`, value: value });
      }
    });
  }

  return paths;
}

/* --- Update Document Preview --- */
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
    previewElem.innerHTML =
      '<div class="error">Error loading document preview</div>';
  }
}

/* --- Update Key Editor --- */
function updateKeyEditor() {
  const container = document.getElementById("keyContainer");
  if (!container) {
    console.error("Key container element not found");
    return;
  }

  try {
    const paths = getOrderedPaths(window.currentDocument);
    const html = paths
      .map(({ path, value }) => {
        const isDateOrParties =
          path.startsWith("Assignment of Copyright.DATE") ||
          path.startsWith("Assignment of Copyright.PARTIES");

        return `
                    <div class="key-editor-item">
                        <div class="key-path"><strong>${path}</strong></div>
                        <div class="value-section">
                            <label>Current Value:</label>
                            <input type="text" class="value-input" value="${
                              value || ""
                            }" readonly data-key="${path}" data-original-value="${
          value || ""
        }">

                            <label>Custom Prompt (optional):</label>
                            <textarea class="prompt-input" placeholder="Enter custom instructions for AI..." data-key="${path}"></textarea>

                            <label>AI Suggestion:</label>
                            <input type="text" class="value-input" data-ai-suggestion="${path}" readonly>

                            <div class="button-group">
                                ${
                                  isDateOrParties
                                    ? `<button class="btn btn-edit edit-button" onclick="editValue('${path}')">Edit</button>`
                                    : `<button class="btn btn-edit ai-button" onclick="updateValueWithAI('${path}')">Get AI Suggestion</button>
                                       <button class="btn btn-edit edit-button" onclick="editValue('${path}')">Edit</button>`
                                }
                                <button class="btn btn-edit save-button" onclick="saveValue('${path}')" disabled>Save Changes</button>
                            </div>
                            <div class="error" id="error-${path}" style="display: none;"></div>
                            <div class="success" id="success-${path}" style="display: none;"></div>
                        </div>
                    </div>
                `;
      })
      .join("");

    container.innerHTML = html;

    document.querySelectorAll(".value-input").forEach((input) => {
      input.addEventListener("input", function () {
        const path = this.getAttribute("data-key");
        const originalValue = this.getAttribute("data-original-value");
        const saveButton = document.querySelector(
          `button.save-button[onclick="saveValue('${path}')"]`
        );
        if (this.value !== originalValue) {
          saveButton.disabled = false;
        } else {
          saveButton.disabled = true;
        }
      });
    });
  } catch (error) {
    console.error("Error updating key editor:", error);
    container.innerHTML = '<div class="error">Error loading key editor</div>';
  }
}

/* --- Edit Value --- */
/**
 * Enables inline editing of a field identified by its data-path.
 */
function editValue(path) {
  // Find the input (or textarea) by its data-value-path
  const input = document.querySelector(`[data-value-path="${path}"]`);
  // Buttons keyed by matching data-path attribute
  const editButton = document.querySelector(
    `button.edit-button[data-path="${path}"]`
  );
  const saveButton = document.querySelector(
    `button.save-button[data-path="${path}"]`
  );
  const aiButton = document.querySelector(
    `button.ai-button[data-path="${path}"]`
  );

  if (!input) return;

  // Make the field editable
  input.readOnly = false;
  input.classList.remove("readonly");
  input.focus();

  // Hide the Edit and AI buttons, enable Save
  if (editButton) editButton.style.display = "none";
  if (aiButton) aiButton.style.display = "none";
  if (saveButton) saveButton.disabled = false;

  // Restore any previously saved text selection if present
  if (savedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
}

/* --- Utility Functions --- */
function splitPath(path) {
  let parts = path.split(".");
  const specialIndex = parts.findIndex((token) => token.trim() === "PARTIES");
  if (specialIndex === -1) {
    return mergeWithRules(parts);
  }
  const leftParts = parts.slice(0, specialIndex);
  const mergedLeft = mergeWithRules(leftParts);
  const rightParts = parts.slice(specialIndex).map((t) => t.trim());
  return mergedLeft.concat(rightParts);
}

function mergeWithRules(tokenArray) {
  let result = [];
  for (let i = 0; i < tokenArray.length; i++) {
    let part = tokenArray[i].trim();
    if (i < tokenArray.length - 1) {
      let nextPart = tokenArray[i + 1].trim();
      if (/^\d+$/.test(part) && /^\D/.test(nextPart)) {
        result.push(part + ". " + nextPart);
        i++;
        continue;
      }
      if (/^\d+$/.test(part) && /^\d+$/.test(nextPart)) {
        result.push(part + "." + nextPart);
        i++;
        continue;
      }
    }
    result.push(part);
  }
  return result;
}

/* --- Save Value --- */
function saveValue(path) {
  const input = document.querySelector(`input[data-key="${path}"]`);
  const suggestion = document.querySelector(
    `input[data-ai-suggestion="${path}"]`
  )?.value;
  const editButton = document.querySelector(
    `button.edit-button[onclick="editValue('${path}')"]`
  );
  const aiButton = document.querySelector(
    `button.ai-button[onclick="updateValueWithAI('${path}')"]`
  );
  const newValue = suggestion || input.value;

  if (!newValue) return;

  try {
    const pathParts = splitPath(path);
    let current = window.currentDocument;

    for (let i = 0; i < pathParts.length - 1; i++) {
      let part = pathParts[i].replace(/\["(.*)"\]/, "$1");
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    let lastPart = pathParts[pathParts.length - 1].replace(/\["(.*)"\]/, "$1");
    current[lastPart] = newValue;

    // Update the preview display
    updatePreview();

    // Highlight the updated section
    highlightDocumentSection(path);

    const previewElement = document.querySelector(
      `span[data-value-path="${path}"]`
    );
    if (previewElement) {
      let keyLabel = previewElement.querySelector("strong");
      if (keyLabel) {
        keyLabel.nextSibling.nodeValue = " " + newValue;
      } else {
        previewElement.textContent = newValue;
      }
    }

    const currentValueInput = document.querySelector(
      `input[data-key="${path}"]`
    );
    if (currentValueInput) {
      currentValueInput.value = newValue;
      currentValueInput.readOnly = true;
      currentValueInput.setAttribute("data-original-value", newValue);
    }

    const suggestionInput = document.querySelector(
      `input[data-ai-suggestion="${path}"]`
    );
    if (suggestionInput) {
      suggestionInput.value = "";
    }

    const saveButton = document.querySelector(
      `button.save-button[onclick="saveValue('${path}')"]`
    );
    if (saveButton) {
      saveButton.disabled = true;
    }

    if (aiButton) aiButton.style.display = "";
    if (editButton) editButton.style.display = "";

    const successDiv = document.getElementById(`success-${path}`);
    if (successDiv) {
      successDiv.textContent = "Changes saved successfully";
      successDiv.style.display = "block";
      setTimeout(() => {
        successDiv.style.display = "none";
      }, 3000);
    }

    const errorDiv = document.getElementById(`error-${path}`);
    if (errorDiv) errorDiv.style.display = "none";
  } catch (error) {
    console.error("Error saving value:", error);
    const errorDiv = document.getElementById(`error-${path}`);
    if (errorDiv) {
      errorDiv.textContent = "Failed to save changes";
      errorDiv.style.display = "block";
    }
  }
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

/* --- Expose functions to global scope --- */
// Make all functions available globally for HTML event handlers
window.openAddKeyValueDialog = openAddKeyValueDialog;
window.closeAddKeyValueDialog = closeAddKeyValueDialog;
window.addKeyValuePair = addKeyValuePair;
window.openAddSubKeyValueDialog = openAddSubKeyValueDialog;
window.closeAddSubKeyValueDialog = closeAddSubKeyValueDialog;
window.addSubKeyValuePair = addSubKeyValuePair;
window.enableEditing = enableEditing;
window.openInsertDialog = openInsertDialog;
window.closeInsertDialog = closeInsertDialog;
window.insertNewContent = insertNewContent;
window.editValue = editValue;
window.saveValue = saveValue;
window.downloadWordDocx = downloadWordDocx;
window.showQuestionnaire = showQuestionnaire;
window.closeQuestionnaireModal = closeQuestionnaireModal;
window.submitQuestionnaire = submitQuestionnaire;
window.handleFieldChange = handleFieldChange;
window.handleConsiderationTypeChange = handleConsiderationTypeChange;
window.handlePartyTypeChange = handlePartyTypeChange;
window.updateValueWithAI = updateValueWithAI;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.openEditDialog = openEditDialog;
window.closeEditDialog = closeEditDialog;
window.submitAIEditRequest = submitAIEditRequest;
window.toggleEditMode = toggleEditMode;
