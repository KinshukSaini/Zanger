// Document order configuration
const sectionOrder = [
  "LICENSING AGREEMENT",
  "INTRODUCTION",
  "License",
  "Consideration",
  "Right to Sublicense",
  "Affiliates",
  "Copies",
  "Intellectual Property Notice and Markings",
  "Quality Control",
  "Ownership of Licensed IP",
  "Confidential Information",
  "Exceptions on Confidential Information",
  "Survival of Confidential Information",
  "Users Diligence",
  "Legal Action",
  "Mutual Representations and Warranties",
  "Owner's Representations and Warranties",
  "No Warranties",
  "Laws and Regulations",
  "Indemnification by Owner",
  "Indemnification by User",
  "Indemnification Procedure",
  "Limitations of Liability",
  "Term",
  "Termination",
  "Assignment",
  "Severability",
  "No Waiver",
  "Entire Agreement",
  "Governing Law",
  "Dispute Resolution",
  "Notices",
  "Amendments",
  "SIGNATURES",
];

// Store form data
let formDataStore = {};
let documentTemplate; // To store the initial structure

// --- Reusable Utility Functions (Copy from copyright.js or implement as needed) ---
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
    const keys = key.split("."); // Simplified split, adjust if keys can contain '.'
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
    console.error(
      "window.currentDocument is not defined for licensing agreement."
    );
    // Fallback to an empty structure or load licensing-agreement.json directly if needed
    documentTemplate = { "Licensing Agreement": {} };
  }
}

function getDocumentTemplate() {
  if (!documentTemplate) {
    initializeDocumentTemplate();
  }
  return JSON.parse(JSON.stringify(documentTemplate));
}

function formatDate(dateStr) {
  if (!dateStr) return "*[INSERT DATE]*"; // Or some other placeholder
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`; // Adjust format as needed
}
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
// --- End Reusable Utility Functions ---

// Predefined questions for the licensing document
const documentQuestions = {
  step1: {
    title: "Agreement Basics",
    agreementDate: {
      question: "Enter the date of agreement:",
      type: "date",
    },
    agreementPlace: {
      question: "Enter the place of agreement (e.g., City, State):",
      type: "text",
    },
    ownerName: {
      question: "Owner's Full Name or Company Name:",
      type: "text",
    },
    ownerAddress: {
      question: "Owner's Address:",
      type: "textarea",
    },
    userName: {
      question: "User's Full Name or Company Name:",
      type: "text",
    },
    userAddress: {
      question: "User's Address:",
      type: "textarea",
    },
  },
  step2: {
    title: "License Grant",
    licenseType: {
      question: "Type of License:",
      type: "select",
      options: ["Exclusive", "Non-exclusive"],
    },
    // --- MODIFICATION START for dynamic IP items ---
    numberOfIpItems: {
      question: "How many Licensed IP Items?",
      type: "number",
      min: 1, // Minimum 1 item
      max: 25, // Add max attribute to limit to 2 digits
      default: 1,
    },
    // Placeholder for where dynamic IP questions will be injected
    // We will not define licensedIpName1 etc. here directly anymore.
    // They will be generated based on numberOfIpItems.
    // --- MODIFICATION END ---
    licensePurpose: {
      question: "Purpose of the License:",
      type: "textarea",
    },
    territoryType: {
      question: "Territory:",
      type: "select",
      options: ["Worldwide", "Specific Regions"],
    },
    specificRegions: {
      question: "Specify Regions (if applicable, comma-separated):",
      type: "text",
      showIf: "territoryType=Specific Regions", // Example conditional display
    },
  },
  step3: {
    title: "Consideration",
    numberOfPayments: {
      // New
      question: "How many distinct payment terms?",
      type: "number",
      min: 1,
      max: 20, // Add max attribute to limit to 2 digits
      default: 1,
    },
    // payment1Type, payment1DueDate, payment1Amount are removed
    considerationAdditionalProvisions: {
      question: "Additional Consideration Provisions (if any):",
      type: "textarea",
    },
    paymentGracePeriodDays: {
      question: "Payment Grace Period (days):",
      type: "number",
    },
    latePaymentInterest: {
      question: "Interest for Late Payment (% per month):",
      type: "number",
      step: "0.1",
    },
    latePaymentFee: {
      question: "Fixed Late Fee ($):",
      type: "number",
      step: "0.01",
    },
  },
  // Add more steps and questions for other sections like:
  // Right to Sublicense, Affiliates, Quality Control, Term, Termination, Governing Law etc.
  step4: {
    title: "Term and Termination",
    initialTermYears: {
      question: "Initial Term of Agreement (Year(s)):",
      type: "number",
    },
    renewalOption: {
      question: "Agreement Renewal:",
      type: "select",
      options: ["Not automatically renew", "Automatically be renewed"],
    },
    renewalPeriodYears: {
      question: "Renewal Period (Year(s)):",
      type: "number",
      showIf: "renewalOption=Automatically be renewed",
    },
    renewalNoticeDays: {
      question: "Notice period for non-renewal (days prior to end of term):",
      type: "number",
      showIf: "renewalOption=Automatically be renewed",
    },
    terminationCurePeriodDays: {
      question: "Cure period for material breach (days):",
      type: "number",
    },
  },
  step5: {
    title: "Legal & Miscellaneous",
    governingLaw: {
      question: "Governing Law (e.g., State of California, USA):",
      type: "text",
    },
    disputeResolution: {
      question: "Dispute Resolution Method:",
      type: "select",
      options: [
        "Court Litigation",
        "Binding Arbitration",
        "Mediation",
        "Mediation then binding arbitration",
      ],
    },
    arbitrationRules: {
      question: "Arbitration Rules (if applicable, e.g., AAA, JAMS):",
      type: "text",
      showIf:
        "disputeResolution=Binding Arbitration,Mediation then binding arbitration", // Example of multiple values
    },
    amendmentFrequency: {
      question: "How frequently can fees be amended?",
      type: "select",
      options: [
        "monthly",
        "quarterly",
        "semi-annually",
        "annually",
        "bi-annually",
        "every 3 years",
        "every 5 years",
      ],
    },
  },
};

// Maps questionnaire field IDs to document paths
const documentPathMap = {
  agreementDate: ["Licensing Agreement.INTRODUCTION.content"],
  agreementPlace: ["Licensing Agreement.LICENSING AGREEMENT.place"],
  ownerName: ["Licensing Agreement.INTRODUCTION.parties.owner"],
  ownerAddress: ["Licensing Agreement.INTRODUCTION.parties.owner"],
  userName: ["Licensing Agreement.INTRODUCTION.parties.user"],
  userAddress: ["Licensing Agreement.INTRODUCTION.parties.user"],

  licenseType: ["Licensing Agreement.License.1.content"],
  // Dynamic IP items will be handled by specific logic in highlightDocumentSection
  // and applyFormDataToFlatDocument rather than direct map entries here for each item.
  // We can map the container or the count if needed for general section highlighting.
  numberOfIpItems: ["Licensing Agreement.License.1"], // Highlight the general IP list section

  licensePurpose: ["Licensing Agreement.License.2.content"],
  territoryType: ["Licensing Agreement.License.2.content"],
  specificRegions: ["Licensing Agreement.License.2.content"],

  payment1Type: ["Licensing Agreement.Consideration.3.a.content"],
  payment1DueDate: ["Licensing Agreement.Consideration.3.a.i"], // Path to the value itself
  payment1Amount: ["Licensing Agreement.Consideration.3.a.ii"],
  considerationAdditionalProvisions: [
    "Licensing Agreement.Consideration.4.content",
  ],
  paymentGracePeriodDays: ["Licensing Agreement.Consideration.5.content"],
  latePaymentInterest: ["Licensing Agreement.Consideration.5.a"],
  latePaymentFee: ["Licensing Agreement.Consideration.5.b"],

  initialTermYears: ["Licensing Agreement.Term.44.content"],
  renewalOption: ["Licensing Agreement.Term.45.content"],
  renewalPeriodYears: ["Licensing Agreement.Term.45.content"],
  renewalNoticeDays: ["Licensing Agreement.Term.45.content"],
  terminationCurePeriodDays: ["Licensing Agreement.Termination.46.content"],

  governingLaw: ["Licensing Agreement.Governing Law.55.content"],
  disputeResolution: ["Licensing Agreement.Dispute Resolution.56.content"],
  arbitrationRules: [
    "Licensing Agreement.Dispute Resolution.56.b",
    "Licensing Agreement.Dispute Resolution.56.d",
  ], // Needs logic to pick correct path or update template
  amendmentFrequency: ["Licensing Agreement.Amendments.60.c"],
};

/**
 * Applies form data to the flattened document structure.
 * This function needs to be fully implemented based on documentQuestions and licensing-agreement.json
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const docTitle = "Licensing Agreement"; // Assuming this is the main key in your JSON

  // INTRODUCTION
  if (formData.agreementDate || formData.ownerName || formData.userName) {
    const introDate = formData.agreementDate
      ? formatDate(formData.agreementDate)
      : "*[INSERT DATE]*";
    updatedFlatDoc[
      `${docTitle}.INTRODUCTION.content`
    ] = `This License Agreement ("Agreement") is entered into on the ${introDate} between:`;
  }
  if (formData.ownerName || formData.ownerAddress) {
    const ownerName = formData.ownerName || "*[INSERT OWNER(S) NAME]*";
    const ownerAddress = formData.ownerAddress || "*[INSERT ADDRESS]*";
    updatedFlatDoc[
      `${docTitle}.INTRODUCTION.parties.owner`
    ] = `${ownerName} located at ${ownerAddress} ("Owner")`;
  }
  if (formData.userName || formData.userAddress) {
    const userName = formData.userName || "*[INSERT USER(S) NAME]*";
    const userAddress = formData.userAddress || "*[INSERT ADDRESS]*";
    updatedFlatDoc[
      `${docTitle}.INTRODUCTION.parties.user`
    ] = `${userName} located at ${userAddress} ("User")`;
  }
  if (formData.agreementPlace) {
    updatedFlatDoc[`${docTitle}.LICENSING AGREEMENT.place`] =
      formData.agreementPlace || "*[PLACE]*";
  }

  // LICENSE SECTION
  if (formData.licenseType) {
    // Removed licensedIpName1 from condition
    const licenseTypeStr =
      formData.licenseType === "Exclusive" ? "an exclusive" : "a non-exclusive";
    updatedFlatDoc[
      `${docTitle}.License.1.content`
    ] = `The Owner hereby grants to the User ${licenseTypeStr} license to use the following items of intellectual property (the "Licensed IP"):`;
  } else if (!updatedFlatDoc[`${docTitle}.License.1.content`]) {
    // Ensure default if not in form & not in template
    updatedFlatDoc[
      `${docTitle}.License.1.content`
    ] = `The Owner hereby grants to the User *[an exclusive/a non-exclusive]* license to use the following items of intellectual property (the "Licensed IP"):`;
  }

  // --- CORRECTED DYNAMIC IP ITEMS LOGIC ---
  const numberOfIpItems = parseInt(formData.numberOfIpItems, 10) || 0;
  const license1ItemPrefix = `${docTitle}.License.1.`; // e.g., "Licensing Agreement.License.1."

  // 1. Clear existing IP item flat keys (e.g., ...License.1.a.content, ...License.1.a.i)
  // This ensures items from the template or previous renders are removed before adding current ones.
  for (const keyInFlatDoc in updatedFlatDoc) {
    if (keyInFlatDoc.startsWith(license1ItemPrefix)) {
      const subKeyPath = keyInFlatDoc.substring(license1ItemPrefix.length); // e.g., "a.content", "b.i", "note", "content"
      const firstPartOfSubKey = subKeyPath.split(".")[0]; // "a", "b", "note", "content"
      // We only want to delete keys belonging to items 'a', 'b', 'c', etc.
      // These items are structured as 'a.content' or 'a.i'.
      if (
        firstPartOfSubKey.length === 1 &&
        firstPartOfSubKey >= "a" &&
        firstPartOfSubKey <= "z"
      ) {
        delete updatedFlatDoc[keyInFlatDoc];
      }
    }
  }

  // 2. Add/Update current IP items
  for (let i = 0; i < numberOfIpItems; i++) {
    const itemKeyChar = String.fromCharCode(97 + i); // a, b, c...
    const itemName =
      formData[`licensedIpName_${i + 1}`] || "*[NAME/TITLE OF IP]*";
    const itemDesc =
      formData[`licensedIpDesc_${i + 1}`] || "*[DESCRIPTION OF IP]*";

    updatedFlatDoc[
      `${license1ItemPrefix}${itemKeyChar}.content`
    ] = `${itemName}:`;
    updatedFlatDoc[`${license1ItemPrefix}${itemKeyChar}.i`] = itemDesc;
  }
  // Note: The 'note' (e.g., updatedFlatDoc[`${docTitle}.License.1.note`]) and the main 'content'
  // (updatedFlatDoc[`${docTitle}.License.1.content`]) of License.1 are handled separately
  // and should persist or be set as above. They are not cleared by the item clearing loop.

  // --- END CORRECTED DYNAMIC IP ITEMS LOGIC ---

  if (formData.licensePurpose || formData.territoryType) {
    const purpose = formData.licensePurpose || "*[INSERT PURPOSES]*";
    let territoryStr =
      "*[in the following regions: [INSERT REGIONS] **OR** worldwide]*";
    if (formData.territoryType === "Worldwide") {
      territoryStr = "worldwide";
    } else if (
      formData.territoryType === "Specific Regions" &&
      formData.specificRegions
    ) {
      territoryStr = `in the following regions: ${formData.specificRegions}`;
    } else if (formData.territoryType === "Specific Regions") {
      territoryStr = "in the following regions: *[INSERT REGIONS]*";
    }
    updatedFlatDoc[
      `${docTitle}.License.2.content`
    ] = `Solely for the limited purposes of ${purpose}. User is authorized to use the Licensed IP ${territoryStr} (the "Territory").`;
  }

  // CONSIDERATION SECTION
  const numberOfPayments = parseInt(formData.numberOfPayments, 10) || 0;
  const paymentTerms = [];
  // Clear old Consideration.3 flat keys if it was previously an object, before setting it as an array
  // This is important if the structure of Consideration.3 changes from object to array.
  for (const keyInFlatDoc in updatedFlatDoc) {
    if (keyInFlatDoc.startsWith(`${docTitle}.Consideration.3.`)) {
      delete updatedFlatDoc[keyInFlatDoc];
    }
  }
  if (updatedFlatDoc[`${docTitle}.Consideration.3`]) {
    // Delete the old object key itself if it exists
    delete updatedFlatDoc[`${docTitle}.Consideration.3`];
  }

  for (let i = 0; i < numberOfPayments; i++) {
    const paymentType =
      formData[`paymentType_${i + 1}`] || "*[INSERT TYPE OF PAYMENT]*";
    const dueDate = formData[`paymentDueDate_${i + 1}`] || "*[DUE DATE]*";
    const amount = formData[`paymentAmount_${i + 1}`] || "[AMOUNT]";
    paymentTerms.push({
      // Adjust structure to match how you want it in the JSON and how processSectionContent will render it
      // Example: if each payment term is an object with 'type', 'due', 'amount'
      type_content: `Type of payment: ${paymentType}`, // Path: Licensing Agreement.Consideration.3.[i].type_content
      due_date_content: `Payment due date: ${dueDate}`, // Path: Licensing Agreement.Consideration.3.[i].due_date_content
      amount_content: `Payment amount: $${amount}`, // Path: Licensing Agreement.Consideration.3.[i].amount_content
    });
  }
  // This replaces the old static structure for Consideration.3.a
  updatedFlatDoc[`${docTitle}.Consideration.3`] = paymentTerms; // Now an array

  // The rest of Consideration (4, 5) would remain similar unless they also become dynamic
  if (formData.considerationAdditionalProvisions) {
    updatedFlatDoc[`${docTitle}.Consideration.4.content`] =
      formData.considerationAdditionalProvisions ||
      "*[INSERT ADDITIONAL PROVISIONS]*";
  }
  if (
    formData.paymentGracePeriodDays ||
    formData.latePaymentInterest ||
    formData.latePaymentFee
  ) {
    const graceDays = formData.paymentGracePeriodDays || "*[DAYS]*";
    let lateCharges = [];
    if (formData.latePaymentInterest)
      lateCharges.push(
        `Interest of ${formData.latePaymentInterest}% per month charged.`
      );
    if (formData.latePaymentFee)
      lateCharges.push(
        `A late fee of $${formData.latePaymentFee} for each month past the due date.`
      );
    const lateChargesStr =
      lateCharges.length > 0
        ? lateCharges.join(" ")
        : "*[INSERT THOSE THAT APPLY]*";

    updatedFlatDoc[
      `${docTitle}.Consideration.5.content`
    ] = `Payment shall be made within ${graceDays} days of the due date. If any payment is not made within *[DAYS]* days after the due date, the Owner may charge the following: ${lateChargesStr}`;
    // Note: The template has "[DAYS]" twice in section 5. The first one is covered by graceDays.
    // The second one might need its own question or be a fixed value. For now, I'm leaving it as is from template.
    if (formData.latePaymentInterest) {
      updatedFlatDoc[`${docTitle}.Consideration.5.a`] = `Interest of ${
        formData.latePaymentInterest || "[PERCENTAGE]"
      }% per month charged.`;
    }
    if (formData.latePaymentFee) {
      updatedFlatDoc[`${docTitle}.Consideration.5.b`] = `A late fee of $${
        formData.latePaymentFee || "[AMOUNT]"
      } for each month past the due date.`;
    }
  }

  // TERM SECTION
  if (formData.initialTermYears) {
    updatedFlatDoc[
      `${docTitle}.Term.44.content`
    ] = `This Agreement will commence on the Effective Date and will continue in full force and effect for an initial period of ${
      formData.initialTermYears || "*[YEAR(S)]*"
    } year(s).`;
  }
  if (formData.renewalOption) {
    let renewalText = "This Agreement will: ";
    if (formData.renewalOption === "Not automatically renew") {
      renewalText += "*[Not automatically renew]*";
    } else if (formData.renewalOption === "Automatically be renewed") {
      const renewalYears = formData.renewalPeriodYears || "*[YEAR(S)]*";
      const noticeDays = formData.renewalNoticeDays || "*[DAYS]*";
      renewalText += `*[automatically be renewed for periods of ${renewalYears} year(s) each, unless either party gives notice of non-renewal to the other party at least ${noticeDays} days prior to the end of any *[TERM]* year term. The notice will terminate this Agreement upon expiration of the then current term.]*`;
      // Note: The template has "[TERM]" which might need its own question or be linked to initialTermYears.
    } else {
      renewalText += "*[INSERT ONE]*";
    }
    updatedFlatDoc[`${docTitle}.Term.45.content`] = renewalText;
  }

  // TERMINATION SECTION
  if (formData.terminationCurePeriodDays) {
    updatedFlatDoc[
      `${docTitle}.Termination.46.content`
    ] = `Either party may terminate this Agreement immediately upon delivery of written notice to the other party, clearly specifying the grounds for termination if the other party commits a material breach of its obligations under this Agreement and fails to cure the breach within ${
      formData.terminationCurePeriodDays || "*[DAYS]*"
    } days after written notice of the breach is received by the breaching party.`;
  }

  // GOVERNING LAW & DISPUTE RESOLUTION
  if (formData.governingLaw) {
    updatedFlatDoc[
      `${docTitle}.Governing Law.55.content`
    ] = `This Agreement shall be governed under the ${
      formData.governingLaw || "[GOVERNING LAW]"
    }.`;
  }
  if (formData.disputeResolution) {
    let disputeText =
      "Any dispute arising from this Agreement shall be resolved through: ";
    const method = formData.disputeResolution;
    const arbitrationRules =
      formData.arbitrationRules || "*[INSERT ARBITRATION RULES]*";

    // Clear all existing sub-options first
    // This is important so we don't render unused options
    if (updatedFlatDoc[`${docTitle}.Dispute Resolution.56.a`])
      delete updatedFlatDoc[`${docTitle}.Dispute Resolution.56.a`];
    if (updatedFlatDoc[`${docTitle}.Dispute Resolution.56.b`])
      delete updatedFlatDoc[`${docTitle}.Dispute Resolution.56.b`];
    if (updatedFlatDoc[`${docTitle}.Dispute Resolution.56.c`])
      delete updatedFlatDoc[`${docTitle}.Dispute Resolution.56.c`];
    if (updatedFlatDoc[`${docTitle}.Dispute Resolution.56.d`])
      delete updatedFlatDoc[`${docTitle}.Dispute Resolution.56.d`];

    if (method === "Court Litigation") {
      disputeText +=
        "Court Litigation: if either Party brings legal action, the prevailing party will be entitled to recover from the other party, any legal expenses incurred in relation to the claim.";
      updatedFlatDoc[`${docTitle}.Dispute Resolution.56.a`] = disputeText;
    } else if (method === "Binding Arbitration") {
      disputeText += `Binding Arbitration: shall be conducted in accordance with the rules of the ${arbitrationRules}.`;
      updatedFlatDoc[`${docTitle}.Dispute Resolution.56.b`] = disputeText;
    } else if (method === "Mediation") {
      disputeText += "Mediation.";
      updatedFlatDoc[`${docTitle}.Dispute Resolution.56.c`] = disputeText;
    } else if (method === "Mediation then binding arbitration") {
      disputeText += `Mediation then binding arbitration: If the dispute cannot be resolved through mediation, then the dispute will be resolved through binding arbitration conducted in accordance with the rules of the ${arbitrationRules}.`;
      updatedFlatDoc[`${docTitle}.Dispute Resolution.56.d`] = disputeText;
    } else {
      disputeText += "*[INSERT DISPUTE RESOLUTION METHOD]*";
    }

    // Set the main content to just show the intro text
    updatedFlatDoc[`${docTitle}.Dispute Resolution.56.content`] =
      "Any dispute arising from this Agreement shall be resolved through:";
  }

  // AMENDMENTS SECTION
  if (formData.amendmentFrequency) {
    updatedFlatDoc[
      `${docTitle}.Amendments.60.c`
    ] = `and to amend the amount of fees, but no more frequently than ${formData.amendmentFrequency}.`;
  }

  // SIGNATURES - This section often needs dynamic generation based on number of owners/users if applicable
  // For now, assuming fixed structure from template or simple text update.
  // Example:
  // updatedFlatDoc[`${docTitle}.SIGNATURES.content`] = "IN WITNESS WHEREOF...";

  console.log("Applied formData to flatDoc:", updatedFlatDoc);
  return updatedFlatDoc;
}

/**
 * Main function to update the document object with form data
 */
function updateDocumentWithFormData(currentFormData) {
  const templateDoc = getDocumentTemplate();
  const flatTemplate = flattenObject(templateDoc);
  const updatedFlatDoc = applyFormDataToFlatDocument(
    flatTemplate,
    currentFormData
  );
  const updatedDoc = unflattenObject(updatedFlatDoc);
  window.currentDocument = updatedDoc; // Update the global document object
  console.log("Updated window.currentDocument:", window.currentDocument);
}

// --- Highlighting Functions ---
let lastHighlightedElement = null;

function highlightDocumentSection(questionId) {
  console.log("Attempting to highlight for questionId:", questionId);
  const preview = document.getElementById("documentPreview");
  if (!preview) return;

  // Remove previous highlight
  if (lastHighlightedElement) {
    lastHighlightedElement.classList.remove("highlighted-section");
    lastHighlightedElement = null;
  }
  // Remove highlight from all sections if a general questionId is passed or no specific mapping
  preview
    .querySelectorAll(".highlighted-section")
    .forEach((el) => el.classList.remove("highlighted-section"));

  let paths = documentPathMap[questionId];

  // --- MODIFICATION for dynamic IP items ---
  if (!paths && questionId.startsWith("licensedIp")) {
    // e.g., licensedIpName_1, licensedIpDesc_1
    const parts = questionId.split("_"); // licensedIpName, 1
    const itemNumber = parseInt(parts[1], 10);
    if (itemNumber > 0) {
      const itemKey = String.fromCharCode(96 + itemNumber); // 1->a, 2->b
      if (parts[0] === "licensedIpName") {
        paths = [`Licensing Agreement.License.1.${itemKey}.content`];
      } else if (parts[0] === "licensedIpDesc") {
        paths = [`Licensing Agreement.License.1.${itemKey}.i`];
      }
    }
  }
  // --- END MODIFICATION ---

  if (paths && paths.length > 0) {
    paths.forEach((path) => {
      // Try to find an exact match for a value path first
      let targetElement = preview.querySelector(`[data-value-path="${path}"]`);

      // If not found, try to find a section path
      if (!targetElement) {
        targetElement = preview.querySelector(`[data-path="${path}"]`);
      }

      // If still not found, try to find a section whose path starts with the mapped path (for broader sections)
      if (!targetElement) {
        targetElement = preview.querySelector(`[data-path^="${path}"]`);
      }

      if (targetElement) {
        console.log("Highlighting element with path:", path, targetElement);
        targetElement.classList.add("highlighted-section");
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        lastHighlightedElement = targetElement; // Store last highlighted to remove class later
      } else {
        console.log("No element found for path:", path);
      }
    });
  } else {
    console.log("No document paths found for questionId:", questionId);
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
    // input.addEventListener("blur", function () {
    //   // Optionally remove highlight on blur, or leave it
    //   // if (lastHighlightedElement) {
    //   //   lastHighlightedElement.classList.remove("highlighted-section");
    //   //   lastHighlightedElement = null;
    //   // }
    // });
  });
}
// --- End Highlighting Functions ---

// --- UI Functions (Copy from copyright.js and adapt as needed) ---

// --- MODIFICATION START: Function to render dynamic IP questions ---
function renderDynamicIpQuestions(count) {
  const container = document.getElementById("dynamicIpItemsContainer");
  if (!container) return;
  container.innerHTML = ""; // Clear previous dynamic questions

  let dynamicHTML = "";
  for (let i = 1; i <= count; i++) {
    dynamicHTML += `<h5>Licensed IP Item ${i}</h5>`;
    dynamicHTML += createQuestionField(`licensedIpName_${i}`, {
      question: `Name/Title of Licensed IP Item ${i}:`,
      type: "text",
    });
    dynamicHTML += createQuestionField(`licensedIpDesc_${i}`, {
      question: `Description of Licensed IP Item ${i}:`,
      type: "textarea",
    });
  }
  container.innerHTML = dynamicHTML;

  // Re-attach event listeners AND SET INITIAL VALUES for newly created dynamic inputs
  document
    .querySelectorAll(
      "#dynamicIpItemsContainer input, #dynamicIpItemsContainer textarea"
    )
    .forEach((input) => {
      // Restore value if present in formDataStore
      if (formDataStore[input.id]) {
        input.value = formDataStore[input.id];
      }
      input.addEventListener("input", function () {
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
// --- MODIFICATION END ---

function showQuestionnaire() {
  const container = document.getElementById("keyContainer"); // Assuming you have this
  if (!container) {
    console.error("#keyContainer not found for questionnaire.");
    return;
  }
  container.innerHTML = ""; // Clear existing

  let allQuestionsHTML = "";
  Object.keys(documentQuestions).forEach((stepKey) => {
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

  // Initial rendering of dynamic IP questions based on default or stored value
  const numberOfIpItemsInput = document.getElementById("numberOfIpItems");
  let initialIpCount = documentQuestions.step2.numberOfIpItems.default || 1;

  if (formDataStore.numberOfIpItems) {
    initialIpCount = parseInt(formDataStore.numberOfIpItems, 10);
  }

  if (numberOfIpItemsInput) {
    numberOfIpItemsInput.value = initialIpCount;
  }
  renderDynamicIpQuestions(initialIpCount); // This will now also set initial values for dynamic fields

  // Add event listeners to STATIC inputs
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      if (
        input.id.startsWith("licensedIpName_") ||
        input.id.startsWith("licensedIpDesc_")
      ) {
        return; // Skip dynamic ones, they have listeners from renderDynamicIpQuestions
      }

      // Restore value for static fields
      if (formDataStore[input.id] && input.id !== "numberOfIpItems") {
        // numberOfIpItems already handled
        input.value = formDataStore[input.id];
      }
      input.addEventListener("input", function () {
        formDataStore[this.id] = this.value;
        // Handle conditional visibility if this field controls others
        if (
          this.id === "territoryType" ||
          this.id === "renewalOption" ||
          this.id === "disputeResolution"
        ) {
          handleConditionalFieldChange(this);
        }
        if (this.id === "numberOfIpItems") {
          let count = parseInt(this.value, 10) || 0;
          const minCount = documentQuestions.step2.numberOfIpItems.min || 1;
          const maxCount = documentQuestions.step2.numberOfIpItems.max || 99;

          // Enforce the max limit
          if (count > maxCount) {
            count = maxCount;
            this.value = count; // Update input display
            formDataStore[this.id] = count.toString(); // Update form data
          }

          if (count >= minCount) {
            // Ensure count is not less than min
            renderDynamicIpQuestions(count);
          } else {
            // Optionally reset to min if user enters a lower number
            // this.value = minCount;
            // renderDynamicIpQuestions(minCount);
          }
        }
        if (this.id === "numberOfPayments") {
          let count = parseInt(this.value, 10) || 0;
          const minPaymentCount =
            documentQuestions.step3.numberOfPayments.min || 1;
          const maxCount = documentQuestions.step3.numberOfPayments.max || 99;

          // Enforce the max limit
          if (count > maxCount) {
            count = maxCount;
            this.value = count; // Update input display
            formDataStore[this.id] = count.toString(); // Update form data
          }

          if (count >= minPaymentCount) {
            renderDynamicPaymentQuestions(count);
          }
        }
        updateDocumentWithFormData(formDataStore);
        updatePreview();
        highlightDocumentSection(this.id);
      });
      if (
        input.tagName === "SELECT" &&
        (input.id === "territoryType" ||
          input.id === "renewalOption" ||
          input.id === "disputeResolution")
      ) {
        handleConditionalFieldChange(input);
      }
    });

  // Restore data for static fields (general loop, but skip dynamic ones again)
  Object.keys(formDataStore).forEach((key) => {
    const inputElement = document.getElementById(key);
    // Ensure we are not trying to set value for dynamic IP items here again,
    // and also numberOfIpItems is already set.
    if (
      inputElement &&
      !(
        key.startsWith("licensedIpName_") || key.startsWith("licensedIpDesc_")
      ) &&
      key !== "numberOfIpItems"
    ) {
      inputElement.value = formDataStore[key];
      if (
        inputElement.tagName === "SELECT" &&
        (inputElement.id === "territoryType" ||
          inputElement.id === "renewalOption" ||
          inputElement.id === "disputeResolution")
      ) {
        handleConditionalFieldChange(inputElement);
      }
    }
  });

  registerHighlightEvents(); // Register focus/blur listeners
}

function createQuestionsHTML(stepData, stepKey) {
  // Added stepKey
  let html = "";
  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;
    if (typeof data === "object" && data.question) {
      // Single question
      html += createQuestionField(key, data);
      // --- MODIFICATION: Add container for dynamic IP items ---
      if (stepKey === "step2" && key === "numberOfIpItems") {
        html += `<div id="dynamicIpItemsContainer"></div>`;
      }
      // Add container for dynamic Payment items
      if (stepKey === "step3" && key === "numberOfPayments") {
        html += `<div id="dynamicPaymentsContainer"></div>`;
      }
      // --- END MODIFICATION ---
    }
    // Add logic for question groups if needed, similar to copyright.js
  }
  return html;
}

function createQuestionField(key, data) {
  if (!data.question) return "";
  let visibilityAttr = "";
  if (data.showIf) {
    const [conditionKey, conditionValue] = data.showIf.split("=");
    // For multiple values in showIf (e.g., "field=value1,value2")
    const conditionValues = conditionValue.split(",");
    visibilityAttr = `data-show-if-key="${conditionKey}" data-show-if-values="${conditionValues.join(
      ","
    )}" style="display: none;"`;
  }
  return `
    <div class="question-field" ${visibilityAttr}>
      <label for="${key}">${data.question}</label>
      ${createInputElement(key, data)}
    </div>
  `;
}

function createInputElement(key, data) {
  const placeholder = data.placeholder
    ? `placeholder="${data.placeholder}"`
    : "";
  const stepAttr = data.step ? `step="${data.step}"` : "";
  const minAttr = data.min !== undefined ? `min="${data.min}"` : "";
  const maxAttr = data.max !== undefined ? `max="${data.max}"` : ""; // Add max attribute support

  switch (data.type) {
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" ${placeholder}></textarea>`;
    case "date":
      return `<input type="date" id="${key}">`;
    case "select":
      const optionsHtml = data.options
        .map((opt) => `<option value="${opt}">${opt}</option>`)
        .join("");
      return `<select id="${key}"><option value="">Select...</option>${optionsHtml}</select>`;
    case "number":
      return `<input type="number" id="${key}" ${placeholder} ${stepAttr} ${minAttr} ${maxAttr}>`; // Include maxAttr here
    default: // text
      return `<input type="text" id="${key}" ${placeholder}>`;
  }
}

function handleConditionalFieldChange(controllerElement) {
  const controllerKey = controllerElement.id;
  const controllerValue = controllerElement.value;

  document
    .querySelectorAll(`[data-show-if-key="${controllerKey}"]`)
    .forEach((dependentField) => {
      const showIfValues = dependentField
        .getAttribute("data-show-if-values")
        .split(",");
      if (showIfValues.includes(controllerValue)) {
        dependentField.style.display = "block";
      } else {
        dependentField.style.display = "none";
        // Optionally clear the value of hidden fields
        const inputInside = dependentField.querySelector(
          "input, select, textarea"
        );
        if (inputInside) {
          // inputInside.value = ''; // Uncomment to clear
          // delete formDataStore[inputInside.id]; // Uncomment to clear from store
        }
      }
    });
}

function convertToHtml(doc) {
  let htmlParts = [];
  const docTitle = Object.keys(doc)[0]; // Should be "Licensing Agreement"
  if (!docTitle || !doc[docTitle])
    return "<p>Document data is missing or malformed.</p>";

  // Do not add the main document title as a highlightable section here if it's not in sectionOrder
  // htmlParts.push(`<div class="document-title"><strong>${docTitle.toUpperCase()}</strong></div>`);

  const mainContent = doc[docTitle];

  sectionOrder.forEach((sectionKey) => {
    if (mainContent[sectionKey]) {
      // IMPORTANT: The data-path here should exactly match what documentPathMap might point to for a section.
      const sectionPath = `${docTitle}.${sectionKey}`;
      htmlParts.push(
        `<div class="document-section" data-path="${sectionPath}">`
      ); // data-path for the whole section
      htmlParts.push(`<h5><strong>${sectionKey.toUpperCase()}</strong></h5>`);
      // Pass the sectionPath to processSectionContent so it can build data-value-path attributes correctly
      processSectionContent(mainContent[sectionKey], sectionPath, htmlParts, 1);
      htmlParts.push(`</div>`);
    }
  });

  return htmlParts.join("");
}

function processSectionContent(sectionData, currentBasePath, htmlParts, level) {
  const indent = level * 15;
  if (typeof sectionData === "string") {
    htmlParts.push(
      `<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${currentBasePath}">${sectionData}</div>`
    );
  } else if (Array.isArray(sectionData)) {
    // --- MODIFICATION for Consideration.3 array ---
    if (currentBasePath.endsWith(".Consideration.3")) {
      sectionData.forEach((paymentTerm, index) => {
        const itemPath = `${currentBasePath}.${index}`; // e.g., Licensing Agreement.Consideration.3.0
        htmlParts.push(
          `<div class="document-line sub-item-title" style="margin-left: ${
            indent + 15
          }px;"><strong>Payment Term ${index + 1}:</strong></div>`
        );
        if (paymentTerm.type_content) {
          htmlParts.push(
            `<div class="document-line" style="margin-left: ${
              indent + 30
            }px;" data-value-path="${itemPath}.type_content">${
              paymentTerm.type_content
            }</div>`
          );
        }
        if (paymentTerm.due_date_content) {
          htmlParts.push(
            `<div class="document-line" style="margin-left: ${
              indent + 30
            }px;" data-value-path="${itemPath}.due_date_content">${
              paymentTerm.due_date_content
            }</div>`
          );
        }
        if (paymentTerm.amount_content) {
          htmlParts.push(
            `<div class="document-line" style="margin-left: ${
              indent + 30
            }px;" data-value-path="${itemPath}.amount_content">${
              paymentTerm.amount_content
            }</div>`
          );
        }
      });
      return; // Handled Consideration.3 array
    }
    // --- END MODIFICATION ---
    // Default array processing
    sectionData.forEach((item, index) => {
      processSectionContent(
        item,
        `${currentBasePath}.${index}`,
        htmlParts,
        level + 1
      );
    });
  } else if (typeof sectionData === "object" && sectionData !== null) {
    // Special handling for known structures like 'parties'
    if (currentBasePath.endsWith(".INTRODUCTION") && sectionData.parties) {
      if (sectionData.content) {
        // Render the main content of INTRODUCTION first
        htmlParts.push(
          `<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${currentBasePath}.content">${sectionData.content}</div>`
        );
      }
      const partiesPath = `${currentBasePath}.parties`;
      if (sectionData.parties.owner)
        htmlParts.push(
          `<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${partiesPath}.owner">${sectionData.parties.owner}</div>`
        );
      if (sectionData.parties.user)
        htmlParts.push(
          `<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${partiesPath}.user">${sectionData.parties.user}</div>`
        );
      if (sectionData.parties.agreement_intro)
        htmlParts.push(
          `<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${partiesPath}.agreement_intro">${sectionData.parties.agreement_intro}</div>`
        );
      // Render other keys in INTRODUCTION if any, excluding 'parties' and 'content' already handled
      Object.keys(sectionData).forEach((key) => {
        if (key !== "parties" && key !== "content") {
          processSectionContent(
            sectionData[key],
            `${currentBasePath}.${key}`,
            htmlParts,
            level
          );
        }
      });
      return;
    }
    if (
      currentBasePath.endsWith(".SIGNATURES") &&
      sectionData.signature_blocks
    ) {
      if (sectionData.content) {
        // Render the main content of SIGNATURES first
        htmlParts.push(
          `<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${currentBasePath}.content">${sectionData.content}</div>`
        );
      }
      const sigBlockPath = `${currentBasePath}.signature_blocks`;
      // Custom rendering for signature blocks
      // ... (your existing signature block rendering logic, ensuring data-value-path is set for highlightable parts)
      if (sectionData.signature_blocks.owner) {
        htmlParts.push(
          `<div class="document-line" style="margin-left: ${indent}px;"><strong>Owner Signatures:</strong></div>`
        );
        sectionData.signature_blocks.owner.forEach((sig, i) => {
          htmlParts.push(
            `<div class="document-line" style="margin-left: ${
              indent + 15
            }px;" data-value-path="${sigBlockPath}.owner.${i}.signature_line">${
              sig.signature_line || "____________________"
            }</div>`
          );
          htmlParts.push(
            `<div class="document-line" style="margin-left: ${
              indent + 15
            }px;" data-value-path="${sigBlockPath}.owner.${i}.name_line">${
              sig.name_line || "Name"
            }</div><br/>`
          );
        });
      }
      // ... (similar for user) ...
      Object.keys(sectionData).forEach((key) => {
        if (key !== "signature_blocks" && key !== "content") {
          processSectionContent(
            sectionData[key],
            `${currentBasePath}.${key}`,
            htmlParts,
            level
          );
        }
      });
      return;
    }

    // --- ADD NEW SPECIAL HANDLING FOR LICENSE.1 ---
    if (currentBasePath.endsWith(".License.1")) {
      // Render the main content string first (e.g., "The Owner hereby grants...")
      if (sectionData.content) {
        htmlParts.push(
          `<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${currentBasePath}.content">${sectionData.content}</div>`
        );
      }

      // Process letter keys (a, b, c...) - sort them to maintain order
      const letterKeys = Object.keys(sectionData)
        .filter((key) => key.length === 1 && key >= "a" && key <= "z")
        .sort();

      letterKeys.forEach((letter) => {
        const itemPath = `${currentBasePath}.${letter}`;

        // IP name/title (content)
        if (sectionData[letter].content) {
          htmlParts.push(
            `<div class="document-line" style="margin-left: ${
              indent + 15
            }px;" data-value-path="${itemPath}.content">${
              sectionData[letter].content
            }</div>`
          );
        }

        // IP description (i)
        if (sectionData[letter].i) {
          htmlParts.push(
            `<div class="document-line" style="margin-left: ${
              indent + 30
            }px;" data-value-path="${itemPath}.i">${
              sectionData[letter].i
            }</div>`
          );
        }
      });

      // Add any note or other non-letter keys at the end
      Object.keys(sectionData)
        .filter(
          (key) =>
            !(
              key === "content" ||
              (key.length === 1 && key >= "a" && key <= "z")
            )
        )
        .forEach((key) => {
          processSectionContent(
            sectionData[key],
            `${currentBasePath}.${key}`,
            htmlParts,
            level + 1
          );
        });

      return; // Important - skip default processing after handling this special case
    }
    // --- END NEW SPECIAL HANDLING FOR LICENSE.1 ---

    // Default object processing: iterate keys
    Object.keys(sectionData)
      .sort()
      .forEach((key) => {
        const valuePath = `${currentBasePath}.${key}`;
        if (typeof sectionData[key] === "string") {
          // Hide labels for 'content' and 'place'
          const hideLabels = ["content", "place"];
          const displayKey = hideLabels.includes(key) 
            ? ""
            : `<strong>${key}:</strong> `;
          htmlParts.push(
            `<div class="document-line" style="margin-left: ${indent}px;" data-value-path="${valuePath}">${displayKey}${sectionData[key]}</div>`
          );
        } else {
          // For nested objects/arrays, print the key as a sub-header (if not a list marker) and recurse
          if (
            !/^(i{1,3}|[a-z])$/.test(key) ||
            typeof sectionData[key] !== "string"
          ) {
            htmlParts.push(
              `<div class="document-line sub-item-title" style="margin-left: ${indent}px;" data-path="${valuePath}"><strong>${key}</strong></div>`
            ); // Add data-path for sub-sections
          }
          processSectionContent(
            sectionData[key],
            valuePath,
            htmlParts,
            level + 1
          );
        }
      });
  }
}

function updatePreview() {
  const previewElem = document.getElementById("documentPreview"); // Assuming you have this
  if (!previewElem) {
    console.error("Preview element not found.");
    return;
  }
  if (!window.currentDocument) {
    console.error("window.currentDocument not found for preview.");
    previewElem.innerHTML = "<p>Error: Document data not loaded.</p>";
    return;
  }
  previewElem.innerHTML = convertToHtml(window.currentDocument);
}
// --- End UI Functions ---

// DOMContentLoaded listener
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Licensing Document initialization started");
  try {
    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    // Set up event listeners for the AI Edit dialog
    document
      .getElementById("submit-ai-edit")
      .addEventListener("click", submitAIEditRequest);
  } catch (e) {
    console.log(e);
  }

  // Ensure window.currentDocument is loaded (e.g., via a script tag setting it from licensing-agreement.json)
  // For this example, I'll assume it's pre-loaded.
  // If not, you'd fetch and parse licensing-agreement.json here.
  if (
    !window.currentDocument ||
    !window.currentDocument["Licensing Agreement"]
  ) {
    console.warn(
      "window.currentDocument for Licensing Agreement not found or malformed. Attempting to load from template."
    );

    // Simulate loading if not present (replace with actual fetch if needed)
    // This is a simplified version of how you might fetch the JSON if it's not preloaded.
    try {
      const response = await fetch("../templates/licensing-agreement.json");
      // Adjust path as needed
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      window.currentDocument = await response.json();
      console.log(
        "Loaded licensing-agreement.json into window.currentDocument"
      );
    } catch (e) {
      console.error("Failed to load licensing-agreement.json:", e);
      window.currentDocument = { "Licensing Agreement": {} }; // Fallback
    }
  }

  initializeDocumentTemplate(); // Initialize with the loaded document
  showQuestionnaire();
  updateDocumentWithFormData(formDataStore); // Initial population based on defaults or empty store
  updatePreview();

  // Add other initializations (AI features, highlighting) from copyright.js if needed
  console.log("Licensing Document initialization completed with highlighting.");

  // Initial rendering for dynamic payments
  const numberOfPaymentsInput = document.getElementById("numberOfPayments");
  let initialPaymentCount =
    documentQuestions.step3.numberOfPayments.default || 1;
  if (formDataStore.numberOfPayments) {
    initialPaymentCount = parseInt(formDataStore.numberOfPayments, 10);
  }
  if (numberOfPaymentsInput) {
    numberOfPaymentsInput.value = initialPaymentCount;
  }
  renderDynamicPaymentQuestions(initialPaymentCount);
});

function renderDynamicPaymentQuestions(count) {
  const container = document.getElementById("dynamicPaymentsContainer");
  if (!container) return;
  container.innerHTML = "";

  let dynamicHTML = "";
  for (let i = 1; i <= count; i++) {
    dynamicHTML += `<h5>Payment Term ${i}</h5>`;
    dynamicHTML += createQuestionField(`paymentType_${i}`, {
      question: `Type of Payment ${i}:`,
      type: "text",
      placeholder: "e.g., Royalty, Flat Fee",
    });
    dynamicHTML += createQuestionField(`paymentDueDate_${i}`, {
      question: `Payment ${i} Due Date:`,
      type: "text",
      placeholder: "e.g., Upon signing, Net 30",
    });
    dynamicHTML += createQuestionField(`paymentAmount_${i}`, {
      question: `Payment ${i} Amount ($):`,
      type: "text",
      placeholder: "e.g., 1000.00",
    });
  }
  container.innerHTML = dynamicHTML;

  document
    .querySelectorAll("#dynamicPaymentsContainer input") // Assuming only text inputs for now
    .forEach((input) => {
      if (formDataStore[input.id]) {
        input.value = formDataStore[input.id];
      }
      input.addEventListener("input", function () {
        formDataStore[this.id] = this.value;
        updateDocumentWithFormData(formDataStore);
        updatePreview();
        highlightDocumentSection(this.id); // You'll need to adapt highlightDocumentSection for these
      });
      input.addEventListener("focus", function () {
        highlightDocumentSection(this.id);
      });
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
