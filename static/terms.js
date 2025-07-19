/**
 * Complete Consultancy Agreement Handler with Fixed Formatting and Section Headers
 * This handles the consultancy agreement document with proper numbering, bold text, and date handling
 */

// Store document template
let documentTemplate;

// Section order matching the document flow
const sectionOrder = [
  "1. Introduction",
  "2. Definitions", 
  "3. Term",
  "4. Services",
  "5. Deliverables",
  "6. Licence",
  "7. Charges",
  "8. Payments",
  "9. Warranties",
  "10. Limitations and exclusions of liability",
  "11. Termination",
  "12. Effects of termination",
  "13. Status of Consultant",
  "14. Subcontracting",
  "15. General",
  "16. STATEMENT OF WORK",
  "EXECUTION"
];

const agreementSectionOrder = [
  "2. Definitions",
  "3. Term",
  "4. Services",
  "5. Deliverables",
  "6. Licence",
  "7. Charges",
  "8. Payments",
  "9. Warranties",
  "10. Limitations and exclusions of liability",
  "11. Termination",
  "12. Effects of termination",
  "13. Status of Consultant",
  "14. Subcontracting",
  "15. General"
];

// Smart label detection patterns
const INTERNAL_FIELDS_TO_HIDE = ["content", "intro", "options", "suboptions", "death_clause", "selectedOption", "option1", "option2"];
const NUMBERED_PATTERN = /^\d+$/;
const CLAUSE_PATTERN = /^\d+\.\d+$/;
const LETTER_PATTERN = /^[a-z]$/;
const ROMAN_PATTERN = /^i{1,3}|iv|v|vi{1,3}|ix|x$/;
const SECTION_PATTERN = /^\d+\.\s+.+/; // Pattern for "2. Definitions", "3. Term", etc.

/**
 * Enhanced bracket cleanup and OR choice resolution utility
 */
function resolveORChoices(text, selectedChoice = null) {
  if (!text) return text;

  // Convert markdown-style bold to HTML bold FIRST - FIXED
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Handle OR patterns - if a choice is specified, use it, otherwise use first option
  text = text.replace(/\[([^\]]*)\]\s*OR\s*\[([^\]]*)\]/g, (match, option1, option2) => {
    if (selectedChoice === 'option2') {
      return option2;
    }
    return option1; // default to first option
  });

  // Remove all remaining bracket patterns that weren't replaced
  text = text
    .replace(/\[\[([^\]]*)\]\]/g, '$1') // Remove double brackets
    .replace(/\[([^\]]*)\]/g, '$1') // Remove single brackets
    .replace(/\*\[([^\]]*)\]\*/g, '') // Remove placeholder patterns
    .replace(/\s+/g, ' ') // Clean up extra spaces
    .trim();

  return text;
}

/**
 * Flattens a nested object into a flat object with dot notation keys
 */
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

// Enhanced questionnaire covering ALL OR choices from the consultancy agreement
const documentQuestions = {
  step1: {
    title: "Date and Party Information",
    date: {
      question: "Enter the date of agreement",
      type: "date",
    },
    consultantType: {
      question: "Select type of Consultant",
      type: "select",
      options: ["Individual", "Company"]
    },
    consultantName: {
      question: "Enter consultant's full name",
      type: "text",
      showIf: "consultantType=Individual"
    },
    consultantAddress: {
      question: "Enter consultant's address",
      type: "textarea",
      placeholder: "Full address including postcode",
      showIf: "consultantType=Individual"
    },
    consultantCompanyName: {
      question: "Enter company name",
      type: "text",
      showIf: "consultantType=Company"
    },
    consultantJurisdiction: {
      question: "Enter jurisdiction of incorporation",
      type: "text",
      placeholder: "e.g., England and Wales",
      showIf: "consultantType=Company"
    },
    consultantRegNumber: {
      question: "Enter registration number",
      type: "text",
      placeholder: "e.g., 12345678",
      showIf: "consultantType=Company"
    },
    consultantOfficeAddress: {
      question: "Enter registered office address",
      type: "textarea",
      placeholder: "Full registered office address including postcode",
      showIf: "consultantType=Company"
    }
  },
  step2: {
    title: "Client Information",
    clientType: {
      question: "Select type of Client",
      type: "select",
      options: ["Individual", "Company"]
    },
    clientName: {
      question: "Enter client's full name",
      type: "text",
      showIf: "clientType=Individual"
    },
    clientAddress: {
      question: "Enter client's address",
      type: "textarea",
      placeholder: "Full address including postcode",
      showIf: "clientType=Individual"
    },
    clientCompanyName: {
      question: "Enter company name",
      type: "text",
      showIf: "clientType=Company"
    },
    clientJurisdiction: {
      question: "Enter jurisdiction of incorporation",
      type: "text",
      placeholder: "e.g., England and Wales",
      showIf: "clientType=Company"
    },
    clientRegNumber: {
      question: "Enter registration number",
      type: "text",
      placeholder: "e.g., 87654321",
      showIf: "clientType=Company"
    },
    clientOfficeAddress: {
      question: "Enter registered office address",
      type: "textarea",
      placeholder: "Full registered office address including postcode",
      showIf: "clientType=Company"
    }
  },
  step3: {
    title: "Agreement Term & Services",
    includeDefinitionsException: {
      question: "Include 'except to the extent expressly provided otherwise' in definitions?",
      type: "select",
      options: ["Include", "Exclude"]
    },
    termOption: {
      question: "Select agreement term",
      type: "select",
      options: [
        "Continue indefinitely",
        "Until specific date",
        "Until specific event"
      ]
    },
    termDate: {
      question: "Enter termination date",
      type: "date",
      showIf: "termOption=Until specific date"
    },
    termEvent: {
      question: "Enter termination event",
      type: "text",
      placeholder: "e.g., completion of project, end of financial year",
      showIf: "termOption=Until specific event"
    },
    serviceStandardOption: {
      question: "Select service standard",
      type: "select",
      options: [
        "With reasonable skill and care",
        "In accordance with industry standards",
        "Custom standard"
      ]
    },
    customServiceStandard: {
      question: "Specify custom service standard",
      type: "textarea",
      placeholder: "Describe the specific standards the consultant must meet",
      showIf: "serviceStandardOption=Custom standard"
    }
  },
  step4: {
    title: "Deliverables & Payments",
    deliverablesOption: {
      question: "Select deliverables definition",
      type: "select",
      options: [
        "As specified in Schedule 1",
        "Custom definition"
      ]
    },
    customDeliverablesDefinition: {
      question: "Define the deliverables",
      type: "textarea",
      placeholder: "Define what deliverables the consultant will provide",
      showIf: "deliverablesOption=Custom definition"
    },
    deliverablesObligationLevel: {
      question: "Select deliverables obligation level",
      type: "select",
      options: [
        "Ensure deliverables meet requirements",
        "Use best endeavours to ensure deliverables meet requirements",
        "Use reasonable endeavours to ensure deliverables meet requirements"
      ]
    },
    vatOption: {
      question: "Select VAT treatment for charges",
      type: "select",
      options: [
        "Inclusive of any applicable value added taxes",
        "Exclusive of any applicable value added taxes"
      ]
    },
    invoiceOption: {
      question: "Select when invoices will be issued",
      type: "select",
      options: [
        "From time to time during the Term",
        "On specified invoicing dates in Schedule 1",
        "After services delivered",
        "In advance of service delivery"
      ]
    },
    paymentPeriod: {
      question: "Enter payment period (days)",
      type: "text",
      placeholder: "e.g., 30",
      defaultValue: "30"
    },
    paymentTimingOption: {
      question: "Select payment timing calculation",
      type: "select",
      options: [
        "From issue of invoice",
        "From receipt of invoice"
      ]
    }
  },
  step5: {
    title: "Liability & Risk Management",
    liabilityOption: {
      question: "Select liability limitation scope",
      type: "select",
      options: [
        "Neither party shall be liable",
        "The Consultant shall not be liable",
        "The Client shall not be liable"
      ]
    },
    subcontractingOption: {
      question: "Select subcontracting permission",
      type: "select",
      options: [
        "Consultant must not subcontract without consent",
        "Consultant may subcontract with notification"
      ]
    },
    governingLaw: {
      question: "Select governing law",
      type: "select",
      options: ["English law", "Other jurisdiction law"]
    },
    customGoverningLaw: {
      question: "Enter custom governing law jurisdiction",
      type: "text",
      placeholder: "e.g., Scottish law, Welsh law, etc.",
      showIf: "governingLaw=Other jurisdiction law"
    },
    courtJurisdiction: {
      question: "Select court jurisdiction",
      type: "select",
      options: ["England", "Other jurisdiction"]
    },
    customCourtJurisdiction: {
      question: "Enter custom court jurisdiction",
      type: "text",
      placeholder: "e.g., Scotland, Wales, etc.",
      showIf: "courtJurisdiction=Other jurisdiction"
    }
  }
};

// Store form data between steps
let formDataStore = {};

/**
 * Enhanced initialization
 */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Consultancy Agreement": {} };
  }

  try {
    initializeDocumentTemplate();
    console.log("Template initialized");

    showQuestionnaire();
    console.log("Questionnaire shown");

    updatePreview();
    console.log("Preview updated");

    setTimeout(registerHighlightEvents, 500);
    setupEventListeners();

    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    addDocumentStyles();
    console.log("Document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
    console.error("Error stack:", error.stack);
  }
});

/**
 * FIXED DOCUMENT TO HTML CONVERSION WITH PROPER SECTION HEADER FORMATTING
 */
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];

  if (documentTitle) {
    html.push(
      `<div class="document-title" style="text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 20px;">
        <strong>${documentTitle}</strong>
      </div>`
    );

    const mainContent = document[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSection(section, mainContent[section], 0, documentTitle, "ROOT");
      }
    });
  }
  return html.join("");

  function processSection(key, value, level, path, parentSection) {
    const currentPath = path ? `${path}.${key}` : key;
    const isMainSection = sectionOrder.includes(key);
    const isAgreementSubSection = SECTION_PATTERN.test(key);
    const marginLeft = level * 20;

    // Main section headers (DATE, PARTIES, AGREEMENT, EXECUTION)
    if (isMainSection) {
      html.push(
        `<div class="document-line main-section" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
          <h4 style="font-weight: bold; margin: 20px 0 15px 0; font-size: 16px;">
            <strong>${key}</strong>
          </h4>
        </div>`
      );
    }
    // Agreement subsection headers (2. Definitions, 3. Term, etc.)
    else if (isAgreementSubSection) {
      html.push(
        `<div class="document-line agreement-section" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
          <h5 style="font-weight: bold; margin: 15px 0 10px 0; font-size: 14px;">
            <strong>${key}</strong>
          </h5>
        </div>`
      );
    }

    if (typeof value === "object" && value !== null) {
      const keys = Object.keys(value);

      // Use the natural order of keys
      let orderedKeys = keys;

      orderedKeys.forEach((subKey) => {
        const subValue = value[subKey];
        const subMarginLeft = marginLeft + 20;

        // Handle different content types
        if (subValue && typeof subValue === "object") {
          // Handle option selection properly
          if (subValue.selectedOption && subValue.content) {
            const labelToShow = formatLabel(subKey);
            const cleanContent = resolveORChoices(subValue.content, subValue.selectedOption);
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
                <span data-value-path="${currentPath}.${subKey}.content">
                  ${labelToShow}${cleanContent}
                </span>
              </div>`
            );
          } else if (subValue.content !== undefined) {
            // Handle regular content with OR resolution
            let contentToShow = subValue.content;

            // Apply OR choice resolution based on selected option
            if (subValue.selectedOption === 'option2') {
              contentToShow = resolveORChoices(contentToShow, 'option2');
            } else {
              contentToShow = resolveORChoices(contentToShow, 'option1');
            }

            // Determine the appropriate label
            let labelToShow = '';
            if (NUMBERED_PATTERN.test(subKey)) {
              labelToShow = `<strong>${subKey}.</strong> `;
            } else {
              labelToShow = formatLabel(subKey);
            }

            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
                <span data-value-path="${currentPath}.${subKey}.content">
                  ${labelToShow}${contentToShow}
                </span>
              </div>`
            );

            // Process definition items (like Agreement, Charges, etc.) if they exist
            Object.keys(subValue).forEach(innerKey => {
              if (innerKey !== 'content' && innerKey !== 'intro' && innerKey !== 'selectedOption') {
                const innerValue = subValue[innerKey];
                const innerMarginLeft = subMarginLeft + 20;

                // Handle definition terms
                if (typeof innerValue === 'string' && innerValue.trim()) {
                  const cleanInnerValue = resolveORChoices(innerValue);
                  html.push(
                    `<div class="document-line document-content" data-path="${currentPath}.${subKey}.${innerKey}" style="margin-left: ${innerMarginLeft}px;">
                      <span data-value-path="${currentPath}.${subKey}.${innerKey}">
                        <strong>"${innerKey}"</strong> ${cleanInnerValue}
                      </span>
                    </div>`
                  );
                }
              }
            });

            // Process options if they exist and not resolved
            if (!subValue.selectedOption && (subValue.a || subValue.b || subValue.c || subValue.options)) {
              processOptions(subValue, `${currentPath}.${subKey}`, subMarginLeft + 20);
            }
          } else if (subKey === "signature_blocks") {
            // Enhanced signature blocks formatting
            html.push(
              `<div class="document-line document-content" style="margin-left: ${subMarginLeft}px;">
                <p>The parties have indicated their acceptance of this Agreement by executing it below.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr>
                    <td style="width: 50%; vertical-align: top; padding: 15px; border: 1px solid #333;">
                      <strong>CONSULTANT</strong><br><br>
                      <span data-value-path="${currentPath}.${subKey}.consultant">${resolveORChoices(subValue.consultant)}</span><br><br>
                      <span>............................................</span>
                    </td>
                    <td style="width: 50%; vertical-align: top; padding: 15px; border: 1px solid #333;">
                      <strong>CLIENT</strong><br><br>
                      <span data-value-path="${currentPath}.${subKey}.client">${resolveORChoices(subValue.client)}</span><br><br>
                      <span>............................................</span>
                    </td>
                  </tr>
                </table>
              </div>`
            );
          } else if (subKey === "option1" || subKey === "option2") {
            // Skip option1/option2 if selectedOption exists
            if (!value.selectedOption) {
              processSection(subKey, subValue, level + 1, currentPath, key);
            }
          } else if (subKey !== "selectedOption") {
            // Recursive processing for nested objects
            processSection(subKey, subValue, level + 1, currentPath, key);
          }
        } else if (typeof subValue === "string") {
          // Handle string values - clean up brackets and OR choices
          const cleanValue = resolveORChoices(subValue);

          // Determine the appropriate label
          let labelToShow = '';
          if (NUMBERED_PATTERN.test(subKey)) {
            labelToShow = `<strong>${subKey}.</strong> `;
          } else {
            labelToShow = formatLabel(subKey);
          }

          html.push(
            `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
              <span data-value-path="${currentPath}.${subKey}">
                ${labelToShow}${cleanValue}
              </span>
            </div>`
          );
        }
      });
    }
  }

  function processOptions(obj, currentPath, marginLeft) {
    // Handle lettered options (a, b, c, etc.)
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach(letter => {
      if (obj[letter]) {
        const value = obj[letter];
        if (typeof value === 'object' && value.content) {
          // Handle complex options with suboptions
          const cleanContent = resolveORChoices(value.content);
          html.push(
            `<div class="document-line lettered-content" data-path="${currentPath}.${letter}" style="margin-left: ${marginLeft}px;">
              <span data-value-path="${currentPath}.${letter}.content">
                <strong>(${letter})</strong> ${cleanContent}
              </span>
            </div>`
          );

          // Process suboptions (i, ii, iii, etc.)
          ['i', 'ii', 'iii', 'iv', 'v'].forEach(roman => {
            if (value[roman]) {
              const cleanSubContent = resolveORChoices(value[roman]);
              html.push(
                `<div class="document-line sub-option" data-path="${currentPath}.${letter}.${roman}" style="margin-left: ${marginLeft + 20}px;">
                  <span data-value-path="${currentPath}.${letter}.${roman}">
                    <strong>(${roman})</strong> ${cleanSubContent}
                  </span>
                </div>`
              );
            }
          });

          // Handle death_clause specifically
          if (value.death_clause) {
            const cleanDeathClause = resolveORChoices(value.death_clause);
            html.push(
              `<div class="document-line sub-option" data-path="${currentPath}.${letter}.death_clause" style="margin-left: ${marginLeft + 20}px;">
                <span data-value-path="${currentPath}.${letter}.death_clause">
                  ${cleanDeathClause}
                </span>
              </div>`
            );
          }
        } else if (typeof value === 'string') {
          const cleanValue = resolveORChoices(value);
          if (cleanValue && cleanValue.trim()) {
            html.push(
              `<div class="document-line lettered-content" data-path="${currentPath}.${letter}" style="margin-left: ${marginLeft}px;">
                <span data-value-path="${currentPath}.${letter}">
                  <strong>(${letter})</strong> ${cleanValue}
                </span>
              </div>`
            );
          }
        }
      }
    });

    // Handle additional list items
    if (obj.additional) {
      const cleanAdditional = resolveORChoices(obj.additional);
      html.push(
        `<div class="document-line additional-content" data-path="${currentPath}.additional" style="margin-left: ${marginLeft}px;">
          <span data-value-path="${currentPath}.additional">
            ${cleanAdditional}
          </span>
        </div>`
      );
    }
  }

  function formatLabel(key) {
    if (INTERNAL_FIELDS_TO_HIDE.includes(key)) return '';

    // Handle clause numbers like "2.1" - FIXED for proper display
    if (CLAUSE_PATTERN.test(key)) return `<strong>${key}.</strong> `;

    // Handle main numbers like "2" - should show as "2."
    if (NUMBERED_PATTERN.test(key)) return `<strong>${key}.</strong> `;

    // Handle lettered items like "(a)"
    if (LETTER_PATTERN.test(key)) return `<strong>(${key})</strong> `;

    // Handle roman numerals like "(i)"
    if (ROMAN_PATTERN.test(key)) return `<strong>(${key})</strong> `;

    // Handle definition terms (like "Agreement", "Charges", etc.) - FIXED
    if (key && typeof key === 'string' && !key.includes('.') && !key.match(/^\d+$/) && !key.match(/^[a-z]$/) && key !== 'content' && key !== 'intro') {
      return `<strong>"${key}"</strong> `;
    }

    return '';
  }
}

function addDocumentStyles() {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    #documentPreview {
      font-family: 'Times New Roman', serif;
      color: #333;
      line-height: 1.6;
      padding: 30px;
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow-y: auto;
      height: 100%;
    }
    
    .document-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .main-section h4 {
      font-size: 16px;
      font-weight: bold;
      margin: 25px 0 15px;
      color: #000;
      text-transform: uppercase;
    }
    
    .agreement-section h5 {
      font-size: 14px;
      font-weight: bold;
      margin: 20px 0 10px;
      color: #000;
    }
    
    .document-content {
      margin: 8px 0;
      font-size: 12px;
      line-height: 1.5;
    }
    
    .lettered-content {
      margin: 5px 0;
      padding-left: 15px;
    }
    
    .sub-option {
      margin: 3px 0;
      padding-left: 25px;
    }
    
    .highlighted {
      background-color: rgba(255, 255, 0, 0.3);
      border-radius: 3px;
      box-shadow: 0 0 5px rgba(255, 200, 0, 0.5);
      transition: background-color 0.3s ease;
    }
    
    .highlighted-section {
      background-color: rgba(255, 255, 0, 0.2);
      border-left: 3px solid #ffcc00;
      padding-left: 8px;
      border-radius: 3px;
    }
    
    table {
      border-collapse: collapse;
      border: 1px solid #333;
    }
    
    td {
      border: 1px solid #333;
      padding: 10px;
      vertical-align: top;
    }
    
    #documentPreview.editable {
      border: 1px dashed #4a90e2;
      background-color: #fafafa;
    }
  `;
  document.head.appendChild(styleEl);
}

function showQuestionnaire() {
  const container = document.getElementById("keyContainer");
  container.innerHTML = "";

  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= 5; stepNumber++) {
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

  // Add comprehensive event handlers
  document
    .querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea")
    .forEach((input) => {
      input.addEventListener("input", function () {
        formDataStore[this.id] = this.value;

        if (this.id.includes("Type") || this.id.includes("Jurisdiction") || this.id.includes("Law") || this.id.includes("Option")) {
          handleConditionalField(this);
        } else if (this.tagName === "SELECT") {
          handleSelectChange(this);
        } else {
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Restore saved form data
  for (let step = 1; step <= 5; step++) {
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
    const [condition, value] = data.showIf.split("=");
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}" style="display: none;"`;
  }

  const affectedPaths = documentPathMap[key] ?
      `data-affects-path="${documentPathMap[key].join(',')}"` : "";

  return `
    <div class="question-field ${sectionClass}" ${visibilityAttr}>
      <label>${data.question}</label>
      ${createInputElement(key, data, affectedPaths)}
    </div>
  `;
}

function createInputElement(key, data, affectedPaths) {
  // Safety check for options
  if ((key.includes("Type") || key.includes("Jurisdiction") || key.includes("Law") || key.includes("Option")) && data.type === "select") {
    if (!data.options || !Array.isArray(data.options)) {
      console.error(`Field ${key} is missing options array:`, data);
      return `<input type="text" id="${key}" placeholder="Error: Missing options" ${affectedPaths}>`;
    }

    return `
      <select id="${key}" onchange="handleConditionalField(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
      </select>
    `;
  }

  // Standard input types
  switch (data.type) {
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" placeholder="${data.placeholder || ''}" ${affectedPaths}>${data.defaultValue || ""}</textarea>`;
    case "date":
      return `<input type="date" id="${key}" ${affectedPaths}>`;
    case "select":
      if (!data.options || !Array.isArray(data.options)) {
        console.error(`Select field ${key} is missing options array:`, data);
        return `<input type="text" id="${key}" placeholder="Error: Missing options" ${affectedPaths}>`;
      }

      return `
        <select id="${key}" onchange="handleSelectChange(this)" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
        </select>
      `;
    default:
      const defaultVal = data.defaultValue ? `value="${data.defaultValue}"` : "";
      return `<input type="text" id="${key}" placeholder="${data.placeholder || ''}" ${defaultVal} ${affectedPaths}>`;
  }
}

function handleConditionalField(element) {
  formDataStore[element.id] = element.value;

  // Handle conditional field visibility
  const condition = element.id;
  const value = element.value;

  document.querySelectorAll(`[data-show-if="${condition}"]`).forEach((field) => {
    const showValue = field.getAttribute("data-show-value");
    field.style.display = showValue === value ? "block" : "none";
  });

  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(element.id);
}

function handleSelectChange(element) {
  formDataStore[element.id] = element.value;
  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(element.id);
}

function restoreStepData(stepNumber) {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      if (input.tagName === "SELECT") {
        if (input.id.includes("Type") || input.id.includes("Jurisdiction") || input.id.includes("Law") || input.id.includes("Option")) {
          handleConditionalField(input);
        } else {
          handleSelectChange(input);
        }
      }
    }
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * COMPREHENSIVE FORM DATA TO DOCUMENT MAPPING WITH PROPER OR CHOICE RESOLUTION
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Consultancy Agreement";

  // 1. Date - FIXED to prevent duplication
  if (formData.date) {
    const formattedDate = formatDate(formData.date);
    const dateKey = `${documentTitle}.DATE.content`;
    updatedFlatDoc[dateKey] = formattedDate;
  }

  // 2. Definitions exception
  if (formData.includeDefinitionsException) {
    const definitionsKey = `${documentTitle}.AGREEMENT.2. Definitions.2.1.intro`;
    if (formData.includeDefinitionsException === "Include") {
      updatedFlatDoc[definitionsKey] = "In this Agreement, except to the extent expressly provided otherwise:";
    } else {
      updatedFlatDoc[definitionsKey] = "In this Agreement:";
    }
  }

  // 3. Consultant information
  if (formData.consultantType) {
    const consultantKey = `${documentTitle}.PARTIES.1.content`;
    let consultantContent = "";

    if (formData.consultantType === "Individual") {
      const name = formData.consultantName || "*[INDIVIDUAL NAME]*";
      const address = formData.consultantAddress || "*[address]*";
      consultantContent = `${name} of ${address}`;
    } else if (formData.consultantType === "Company") {
      const name = formData.consultantCompanyName || "*[COMPANY NAME]*";
      const jurisdiction = formData.consultantJurisdiction || "*[jurisdiction]*";
      const regNumber = formData.consultantRegNumber || "*[number]*";
      const address = formData.consultantOfficeAddress || "*[address]*";
      consultantContent = `${name}, a company incorporated in ${jurisdiction} (registration number ${regNumber}) having its registered office at ${address}`;
    }

    if (consultantContent) {
      updatedFlatDoc[consultantKey] = consultantContent + ' (**the Consultant**)';
    }
  }

  // 4. Client information
  if (formData.clientType) {
    const clientKey = `${documentTitle}.PARTIES.2.content`;
    let clientContent = "";

    if (formData.clientType === "Individual") {
      const name = formData.clientName || "*[INDIVIDUAL NAME]*";
      const address = formData.clientAddress || "*[address]*";
      clientContent = `${name} of ${address}`;
    } else if (formData.clientType === "Company") {
      const name = formData.clientCompanyName || "*[COMPANY NAME]*";
      const jurisdiction = formData.clientJurisdiction || "*[jurisdiction]*";
      const regNumber = formData.clientRegNumber || "*[registration number]*";
      const address = formData.clientOfficeAddress || "*[address]*";
      clientContent = `${name}, a company incorporated in ${jurisdiction} (registration number ${regNumber}) having its registered office at ${address}`;
    }

    if (clientContent) {
      updatedFlatDoc[clientKey] = clientContent + ' (**the Client**)';
    }
  }

  // 5. Term options with proper OR resolution
  if (formData.termOption) {
    const termKey = `${documentTitle}.AGREEMENT.3. Term.3.2.content`;
    let termContent = "This Agreement shall continue in force ";

    if (formData.termOption === "Continue indefinitely") {
      termContent += "indefinitely";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.3. Term.3.2.selectedOption`] = "option1";
    } else if (formData.termOption === "Until specific date") {
      const date = formData.termDate ? formatDate(formData.termDate) : "*[date]*";
      termContent += `until ${date}, at the beginning of which this Agreement shall terminate automatically`;
      updatedFlatDoc[`${documentTitle}.AGREEMENT.3. Term.3.2.selectedOption`] = "option2";
    } else if (formData.termOption === "Until specific event") {
      const event = formData.termEvent || "*[event]*";
      termContent += `until ${event}, upon which this Agreement shall terminate automatically`;
      updatedFlatDoc[`${documentTitle}.AGREEMENT.3. Term.3.2.selectedOption`] = "option3";
    }

    termContent += ", subject to termination in accordance with Clause 11 or any other provision of this Agreement.";
    updatedFlatDoc[termKey] = termContent;
  }

  // 6. Service standards
  if (formData.serviceStandardOption) {
    const serviceKey = `${documentTitle}.AGREEMENT.4. Services.4.2.content`;
    let serviceContent = "The Consultant shall provide the Services ";

    if (formData.serviceStandardOption === "With reasonable skill and care") {
      serviceContent += "with reasonable skill and care.";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.4. Services.4.2.selectedOption`] = "option1";
    } else if (formData.serviceStandardOption === "In accordance with industry standards") {
      serviceContent += "in accordance with the standards of skill and care reasonably expected from a leading service provider in the Consultant's industry.";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.4. Services.4.2.selectedOption`] = "option2";
    } else if (formData.serviceStandardOption === "Custom standard" && formData.customServiceStandard) {
      serviceContent += formData.customServiceStandard + ".";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.4. Services.4.2.selectedOption`] = "custom";
    }

    updatedFlatDoc[serviceKey] = serviceContent;
  }

  // 7. Deliverables
  if (formData.deliverablesOption) {
    const deliverablesKey = `${documentTitle}.AGREEMENT.2. Definitions.2.1.Deliverables`;
    if (formData.deliverablesOption === "As specified in Schedule 1") {
      updatedFlatDoc[deliverablesKey] = "those deliverables specified in Part 2 of Schedule 1 (Services particulars) that the Consultant has agreed to deliver to the Client under this Agreement, and such other deliverables as the parties may agree in writing from time to time";
    } else if (formData.deliverablesOption === "Custom definition" && formData.customDeliverablesDefinition) {
      updatedFlatDoc[deliverablesKey] = formData.customDeliverablesDefinition + ", and such other deliverables as the parties may agree in writing from time to time";
    }
  }

  if (formData.deliverablesObligationLevel) {
    const deliverablesObligationKey = `${documentTitle}.AGREEMENT.5. Deliverables.5.3.content`;
    let obligationContent = "The Consultant shall ";

    if (formData.deliverablesObligationLevel === "Ensure deliverables meet requirements") {
      obligationContent += "ensure";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.5. Deliverables.5.3.selectedOption`] = "option1";
    } else if (formData.deliverablesObligationLevel === "Use best endeavours to ensure deliverables meet requirements") {
      obligationContent += "use its best endeavours to ensure";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.5. Deliverables.5.3.selectedOption`] = "option2";
    } else if (formData.deliverablesObligationLevel === "Use reasonable endeavours to ensure deliverables meet requirements") {
      obligationContent += "use reasonable endeavours to ensure";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.5. Deliverables.5.3.selectedOption`] = "option3";
    }

    obligationContent += " that the Deliverables are delivered to the Client in accordance with the timetable set out in Part 3 of Schedule 1 (Services particulars) or agreed by the parties in writing.";
    updatedFlatDoc[deliverablesObligationKey] = obligationContent;
  }

  // 8. VAT and Payment terms
  if (formData.vatOption) {
    const vatKey = `${documentTitle}.AGREEMENT.7. Charges.7.2.content`;
    if (formData.vatOption === "Inclusive of any applicable value added taxes") {
      updatedFlatDoc[vatKey] = "All amounts stated in or in relation to this Agreement are, unless the context requires otherwise, stated inclusive of any applicable value added taxes.";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.7. Charges.7.2.selectedOption`] = "option1";
    } else {
      updatedFlatDoc[vatKey] = "All amounts stated in or in relation to this Agreement are, unless the context requires otherwise, stated exclusive of any applicable value added taxes, which will be added to those amounts and payable by the Client to the Consultant.";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.7. Charges.7.2.selectedOption`] = "option2";
    }
  }

  if (formData.invoiceOption) {
    const invoiceKey = `${documentTitle}.AGREEMENT.8. Payments.8.1.content`;
    let invoiceContent = "The Consultant shall issue invoices for the Charges to the Client ";

    switch (formData.invoiceOption) {
      case "From time to time during the Term":
        invoiceContent += "from time to time during the Term.";
        updatedFlatDoc[`${documentTitle}.AGREEMENT.8. Payments.8.1.selectedOption`] = "option1";
        break;
      case "On specified invoicing dates in Schedule 1":
        invoiceContent += "on or after the invoicing dates set out in Part 5 of Schedule 1 (Services particulars).";
        updatedFlatDoc[`${documentTitle}.AGREEMENT.8. Payments.8.1.selectedOption`] = "option2";
        break;
      case "After services delivered":
        invoiceContent += "at any time after the relevant Services have been delivered to the Client.";
        updatedFlatDoc[`${documentTitle}.AGREEMENT.8. Payments.8.1.selectedOption`] = "option3";
        break;
      case "In advance of service delivery":
        invoiceContent += "in advance of the delivery of the relevant Services to the Client.";
        updatedFlatDoc[`${documentTitle}.AGREEMENT.8. Payments.8.1.selectedOption`] = "option4";
        break;
    }

    updatedFlatDoc[invoiceKey] = invoiceContent;
  }

  if (formData.paymentPeriod || formData.paymentTimingOption) {
    const paymentKey = `${documentTitle}.AGREEMENT.8. Payments.8.2.content`;
    const period = formData.paymentPeriod || "30";
    let timingPhrase = "";

    if (formData.paymentTimingOption === "From issue of invoice") {
      timingPhrase = "the issue of an invoice in accordance with this Clause 8";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.8. Payments.8.2.selectedOption`] = "option1";
    } else {
      timingPhrase = "the receipt of an invoice issued in accordance with this Clause 8";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.8. Payments.8.2.selectedOption`] = "option2";
    }

    updatedFlatDoc[paymentKey] = `The Client must pay the Charges to the Consultant within the period of ${period} days following ${timingPhrase}.`;
  }

  // 9. Liability limitations
  if (formData.liabilityOption) {
    const liabilityPhrases = [
      "in respect of any loss of profits or anticipated savings.",
      "in respect of any loss of revenue or income.",
      "in respect of any loss of use or production.",
      "in respect of any loss of business, contracts or opportunities.",
      "in respect of any loss or corruption of any data, database or software.",
      "in respect of any special, indirect or consequential loss or damage."
    ];

    for (let i = 3; i <= 8; i++) {
      const liabilityKey = `${documentTitle}.AGREEMENT.10. Limitations and exclusions of liability.10.${i}.content`;
      let liabilityContent = "";
      let selectedOption = "";

      switch (formData.liabilityOption) {
        case "Neither party shall be liable":
          liabilityContent = "Neither party shall be liable to the other party";
          selectedOption = "option1";
          break;
        case "The Consultant shall not be liable":
          liabilityContent = "The Consultant shall not be liable to the Client";
          selectedOption = "option2";
          break;
        case "The Client shall not be liable":
          liabilityContent = "The Client shall not be liable to the Consultant";
          selectedOption = "option3";
          break;
      }

      liabilityContent += ` ${liabilityPhrases[i-3]}`;
      updatedFlatDoc[liabilityKey] = liabilityContent;
      updatedFlatDoc[`${documentTitle}.AGREEMENT.10. Limitations and exclusions of liability.10.${i}.selectedOption`] = selectedOption;
    }
  }

  // 10. Subcontracting
  if (formData.subcontractingOption) {
    const subcontractingKey = `${documentTitle}.AGREEMENT.14. Subcontracting.14.1`;

    // Clear both options first
    delete updatedFlatDoc[`${subcontractingKey}.option1.content`];
    delete updatedFlatDoc[`${subcontractingKey}.option2.content`];

    if (formData.subcontractingOption === "Consultant must not subcontract without consent") {
      updatedFlatDoc[`${subcontractingKey}.selectedOption`] = "option1";
      updatedFlatDoc[`${subcontractingKey}.content`] =
        "The Consultant must not subcontract any of its obligations under this Agreement without the prior written consent of the Client, providing that the Client must not unreasonably withhold or delay the giving of such consent.";
    } else if (formData.subcontractingOption === "Consultant may subcontract with notification") {
      updatedFlatDoc[`${subcontractingKey}.selectedOption`] = "option2";
      updatedFlatDoc[`${subcontractingKey}.content`] =
        "Subject to any express restrictions elsewhere in this Agreement, the Consultant may subcontract any of its obligations under this Agreement, providing that the Consultant must give to the Client, promptly following the appointment of a subcontractor, a written notice specifying the subcontracted obligations and identifying the subcontractor in question.";
    }
  }

  // 11. Legal jurisdiction
  if (formData.governingLaw) {
    const lawKey = `${documentTitle}.AGREEMENT.15. General.15.7.content`;
    if (formData.governingLaw === "English law") {
      updatedFlatDoc[lawKey] = "This Agreement shall be governed by and construed in accordance with English law.";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.15. General.15.7.selectedOption`] = "default";
    } else if (formData.governingLaw === "Other jurisdiction law" && formData.customGoverningLaw) {
      updatedFlatDoc[lawKey] = `This Agreement shall be governed by and construed in accordance with ${formData.customGoverningLaw}.`;
      updatedFlatDoc[`${documentTitle}.AGREEMENT.15. General.15.7.selectedOption`] = "custom";
    }
  }

  if (formData.courtJurisdiction) {
    const courtKey = `${documentTitle}.AGREEMENT.15. General.15.8.content`;
    if (formData.courtJurisdiction === "England") {
      updatedFlatDoc[courtKey] = "The courts of England shall have exclusive jurisdiction to adjudicate any dispute arising under or in connection with this Agreement.";
      updatedFlatDoc[`${documentTitle}.AGREEMENT.15. General.15.8.selectedOption`] = "default";
    } else if (formData.courtJurisdiction === "Other jurisdiction" && formData.customCourtJurisdiction) {
      updatedFlatDoc[courtKey] = `The courts of ${formData.customCourtJurisdiction} shall have exclusive jurisdiction to adjudicate any dispute arising under or in connection with this Agreement.`;
      updatedFlatDoc[`${documentTitle}.AGREEMENT.15. General.15.8.selectedOption`] = "custom";
    }
  }

  // 12. Execution signatures
  if (formData.consultantType) {
    const consultantSigKey = `${documentTitle}.EXECUTION.signature_blocks.consultant`;
    let signatureContent = "";

    if (formData.consultantType === "Individual") {
      const name = formData.consultantName || "*[individual name]*";
      signatureContent = `**SIGNED BY** ${name} on *[..........], the Consultant`;
    } else if (formData.consultantType === "Company") {
      const signatoryName = "*[individual name]*";
      signatureContent = `**SIGNED BY** ${signatoryName} on *[..........], duly authorised for and on behalf of the Consultant`;
    }

    if (signatureContent) {
      updatedFlatDoc[consultantSigKey] = signatureContent;
    }
  }

  if (formData.clientType) {
    const clientSigKey = `${documentTitle}.EXECUTION.signature_blocks.client`;
    let signatureContent = "";

    if (formData.clientType === "Individual") {
      const name = formData.clientName || "*[individual name]*";
      signatureContent = `**SIGNED BY** ${name} on *[..........], the Client`;
    } else if (formData.clientType === "Company") {
      const signatoryName = "*[individual name]*";
      signatureContent = `**SIGNED BY** ${signatoryName} on *[..........], duly authorised for and on behalf of the Client`;
    }

    if (signatureContent) {
      updatedFlatDoc[clientSigKey] = signatureContent;
    }
  }

  return updatedFlatDoc;
}

// Enhanced document path mapping covering ALL questions
const documentPathMap = {
  // Date and basic info
  "date": ["Consultancy Agreement.DATE.content"],

  // Consultant information - FIXED to target actual party content
  "consultantType": ["Consultancy Agreement.PARTIES.1.content"],
  "consultantName": ["Consultancy Agreement.PARTIES.1.content", "Consultancy Agreement.EXECUTION.signature_blocks.consultant"],
  "consultantAddress": ["Consultancy Agreement.PARTIES.1.content"],
  "consultantCompanyName": ["Consultancy Agreement.PARTIES.1.content", "Consultancy Agreement.EXECUTION.signature_blocks.consultant"],
  "consultantJurisdiction": ["Consultancy Agreement.PARTIES.1.content"],
  "consultantRegNumber": ["Consultancy Agreement.PARTIES.1.content"],
  "consultantOfficeAddress": ["Consultancy Agreement.PARTIES.1.content"],

  // Client information - FIXED to target actual party content
  "clientType": ["Consultancy Agreement.PARTIES.2.content"],
  "clientName": ["Consultancy Agreement.PARTIES.2.content", "Consultancy Agreement.EXECUTION.signature_blocks.client"],
  "clientAddress": ["Consultancy Agreement.PARTIES.2.content"],
  "clientCompanyName": ["Consultancy Agreement.PARTIES.2.content", "Consultancy Agreement.EXECUTION.signature_blocks.client"],
  "clientJurisdiction": ["Consultancy Agreement.PARTIES.2.content"],
  "clientRegNumber": ["Consultancy Agreement.PARTIES.2.content"],
  "clientOfficeAddress": ["Consultancy Agreement.PARTIES.2.content"],

  // Agreement terms
  "includeDefinitionsException": ["Consultancy Agreement.AGREEMENT.2. Definitions.2.1.intro"],
  "termOption": ["Consultancy Agreement.AGREEMENT.3. Term.3.2.content"],
  "termDate": ["Consultancy Agreement.AGREEMENT.3. Term.3.2.content"],
  "termEvent": ["Consultancy Agreement.AGREEMENT.3. Term.3.2.content"],
  "serviceStandardOption": ["Consultancy Agreement.AGREEMENT.4. Services.4.2.content"],
  "customServiceStandard": ["Consultancy Agreement.AGREEMENT.4. Services.4.2.content"],

  // Deliverables and payments
  "deliverablesOption": ["Consultancy Agreement.AGREEMENT.2. Definitions.2.1.Deliverables"],
  "customDeliverablesDefinition": ["Consultancy Agreement.AGREEMENT.2. Definitions.2.1.Deliverables"],
  "deliverablesObligationLevel": ["Consultancy Agreement.AGREEMENT.5. Deliverables.5.3.content"],
  "vatOption": ["Consultancy Agreement.AGREEMENT.7. Charges.7.2.content"],
  "invoiceOption": ["Consultancy Agreement.AGREEMENT.8. Payments.8.1.content"],
  "paymentPeriod": ["Consultancy Agreement.AGREEMENT.8. Payments.8.2.content"],
  "paymentTimingOption": ["Consultancy Agreement.AGREEMENT.8. Payments.8.2.content"],

  // Risk and legal
  "liabilityOption": [
    "Consultancy Agreement.AGREEMENT.10. Limitations and exclusions of liability.10.3.content",
    "Consultancy Agreement.AGREEMENT.10. Limitations and exclusions of liability.10.4.content",
    "Consultancy Agreement.AGREEMENT.10. Limitations and exclusions of liability.10.5.content",
    "Consultancy Agreement.AGREEMENT.10. Limitations and exclusions of liability.10.6.content",
    "Consultancy Agreement.AGREEMENT.10. Limitations and exclusions of liability.10.7.content",
    "Consultancy Agreement.AGREEMENT.10. Limitations and exclusions of liability.10.8.content"
  ],
  "subcontractingOption": ["Consultancy Agreement.AGREEMENT.14. Subcontracting.14.1.content"],
  "governingLaw": ["Consultancy Agreement.AGREEMENT.15. General.15.7.content"],
  "customGoverningLaw": ["Consultancy Agreement.AGREEMENT.15. General.15.7.content"],
  "courtJurisdiction": ["Consultancy Agreement.AGREEMENT.15. General.15.8.content"],
  "customCourtJurisdiction": ["Consultancy Agreement.AGREEMENT.15. General.15.8.content"]
};

function highlightDocumentSection(fieldId) {
  clearHighlights();

  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;

  const previewElem = document.getElementById("documentPreview");
  paths.forEach(path => {
    // First try to find exact path matches
    let elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);

    if (elements.length === 0) {
      // Try to find by data-path
      elements = previewElem.querySelectorAll(`[data-path="${path}"]`);
    }

    if (elements.length === 0) {
      // Try partial path matching for more specific targeting
      const pathParts = path.split('.');
      for (let i = pathParts.length - 1; i >= 2; i--) { // Start from more specific paths
        const partialPath = pathParts.slice(0, i + 1).join('.');
        elements = previewElem.querySelectorAll(`[data-path="${partialPath}"], [data-value-path="${partialPath}"]`);
        if (elements.length > 0) break;
      }
    }

    // Apply highlighting to found elements
    elements.forEach(elem => {
      // For party-related fields, highlight the specific party content, not the heading
      if (path.includes('PARTIES') && (path.includes('.1.') || path.includes('.2.'))) {
        elem.classList.add("highlighted");
      } else {
        elem.classList.add("highlighted-section");
      }
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

/**
 * Update document with form data using template approach
 */
function updateDocumentWithFormData(formData) {
  const templateDoc = getDocumentTemplate();
  const flatTemplate = flattenObject(templateDoc);
  const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, formData);
  const updatedDoc = unflattenObject(updatedFlatDoc);
  window.currentDocument = updatedDoc;
  console.log("Updated document with form data:", window.currentDocument);
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
  return mergeWithRules(path.split(".").map(part => part.trim()));
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

function downloadWordDocx() {
  const content = document.getElementById("documentPreview").innerHTML;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Consultancy Agreement</title>
      <style>
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          margin: 1in;
        }
        .document-title {
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 24pt;
        }
        h4, h5 {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 20pt;
          margin-bottom: 10pt;
        }
        .document-line {
          margin-bottom: 8pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20pt;
        }
        td {
          border: 1px solid #000;
          padding: 10pt;
          vertical-align: top;
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
  link.download = "Consultancy_Agreement.docx";
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

/**
 * Submit questionnaire with enhanced validation
 */
function submitQuestionnaire() {
  try {
    // Validate required fields
    const requiredFields = ['consultantType', 'clientType'];
    const missingFields = requiredFields.filter(field => !formDataStore[field]);

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Validate conditional fields
    if (formDataStore.consultantType === "Individual" && !formDataStore.consultantName) {
      alert("Please enter the consultant's name");
      return;
    }

    if (formDataStore.clientType === "Individual" && !formDataStore.clientName) {
      alert("Please enter the client's name");
      return;
    }

    if (formDataStore.consultantType === "Company" && !formDataStore.consultantCompanyName) {
      alert("Please enter the consultant company name");
      return;
    }

    if (formDataStore.clientType === "Company" && !formDataStore.clientCompanyName) {
      alert("Please enter the client company name");
      return;
    }

    updateDocumentWithFormData(formDataStore);
    updatePreview();

    showNotification("Document saved successfully! All OR choices have been processed and content updated.");

    // Auto-scroll to top of document
    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.scrollTop = 0;
    }

  } catch (error) {
    console.error("Error submitting questionnaire:", error);
    alert("There was an error saving the document. Please try again.");
  }
}

/**
 * Additional event listener setup for better integration
 */
function setupEventListeners() {
  // Add any additional event listeners needed
  const previewElem = document.getElementById("documentPreview");
  if (previewElem) {
    previewElem.addEventListener("mouseup", handleTextSelection);
    previewElem.addEventListener("keyup", handleTextSelection);
  }

  // Add window resize handler
  window.addEventListener('resize', function() {
    // Handle any resize logic if needed
  });

  // Add before unload warning if there are unsaved changes
  window.addEventListener('beforeunload', function(e) {
    if (Object.keys(formDataStore).length > 0) {
      const confirmationMessage = 'You have unsaved changes. Are you sure you want to leave?';
      e.returnValue = confirmationMessage;
      return confirmationMessage;
    }
  });
}

/**
 * Validate form data
 */
function validateFormData(formData) {
  const errors = [];

  // Check required fields
  if (!formData.consultantType) {
    errors.push("Consultant type is required");
  }

  if (!formData.clientType) {
    errors.push("Client type is required");
  }

  // Validate conditional fields based on type
  if (formData.consultantType === "Individual") {
    if (!formData.consultantName) errors.push("Consultant name is required");
    if (!formData.consultantAddress) errors.push("Consultant address is required");
  }

  if (formData.consultantType === "Company") {
    if (!formData.consultantCompanyName) errors.push("Consultant company name is required");
    if (!formData.consultantJurisdiction) errors.push("Consultant jurisdiction is required");
    if (!formData.consultantRegNumber) errors.push("Consultant registration number is required");
    if (!formData.consultantOfficeAddress) errors.push("Consultant office address is required");
  }

  if (formData.clientType === "Individual") {
    if (!formData.clientName) errors.push("Client name is required");
    if (!formData.clientAddress) errors.push("Client address is required");
  }

  if (formData.clientType === "Company") {
    if (!formData.clientCompanyName) errors.push("Client company name is required");
    if (!formData.clientJurisdiction) errors.push("Client jurisdiction is required");
    if (!formData.clientRegNumber) errors.push("Client registration number is required");
    if (!formData.clientOfficeAddress) errors.push("Client office address is required");
  }

  return errors;
}

/**
 * Get or calculate AI suggestions for a specific field
 */
function updateValueWithAI(path) {
  const inputElement = document.querySelector(`input[data-key="${path}"]`);
  const promptElement = document.querySelector(`textarea[data-key="${path}"]`);
  const currentValue = inputElement ? inputElement.value : "";
  const customPrompt = promptElement ? promptElement.value : "";

  const aiSuggestionInput = document.querySelector(`input[data-ai-suggestion="${path}"]`);
  const saveButton = document.querySelector(`button.save-button[onclick="saveValue('${path}')"]`);

  if (!aiSuggestionInput) return;

  // Update UI to show loading state
  const aiButton = document.querySelector(`button.ai-button[onclick="updateValueWithAI('${path}')"]`);
  const originalButtonText = aiButton.textContent;
  aiButton.textContent = "Loading...";
  aiButton.disabled = true;

  // Create default prompt if none was provided
  const prompt = customPrompt || `Please improve this text: "${currentValue}"`;

  // Make API request to get AI suggestion
  fetch("/update_value", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selectedText: currentValue,
      prompt: prompt,
      fullContent: document.getElementById("documentPreview").innerHTML,
    }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((data) => {
      if (data.error) throw new Error(data.error);
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

/**
 * Edit Value function for manual editing
 */
function editValue(path) {
  const input = document.querySelector(`input[data-key="${path}"]`);
  const editButton = document.querySelector(`button.edit-button[onclick="editValue('${path}')"]`);
  const saveButton = document.querySelector(`button.save-button[onclick="saveValue('${path}')"]`);
  const aiButton = document.querySelector(`button.ai-button[onclick="updateValueWithAI('${path}')"]`);

  if (input) {
    input.readOnly = false;
    input.focus();
  }
  if (editButton) editButton.style.display = "none";
  if (aiButton) aiButton.style.display = "none";
  if (saveButton) saveButton.disabled = false;
}

/**
 * Save Value function for saving manual edits
 */
function saveValue(path) {
  const input = document.querySelector(`input[data-key="${path}"]`);
  const suggestion = document.querySelector(`input[data-ai-suggestion="${path}"]`)?.value;
  const editButton = document.querySelector(`button.edit-button[onclick="editValue('${path}')"]`);
  const aiButton = document.querySelector(`button.ai-button[onclick="updateValueWithAI('${path}')"]`);
  const newValue = suggestion || (input ? input.value : "");

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

    updatePreview();
    highlightDocumentSection(path);

    // Update UI elements
    if (input) {
      input.value = newValue;
      input.readOnly = true;
      input.setAttribute("data-original-value", newValue);
    }

    const suggestionInput = document.querySelector(`input[data-ai-suggestion="${path}"]`);
    if (suggestionInput) suggestionInput.value = "";

    const saveButton = document.querySelector(`button.save-button[onclick="saveValue('${path}')"]`);
    if (saveButton) saveButton.disabled = true;

    if (aiButton) aiButton.style.display = "";
    if (editButton) editButton.style.display = "";

    showNotification("Changes saved successfully");

  } catch (error) {
    console.error("Error saving value:", error);
    showNotification("Failed to save changes");
  }
}

/**
 * Enable editing mode for direct document editing
 */
function enableEditing() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) return;
  previewElem.contentEditable = true;
  previewElem.style.border = "1px dashed #aaa";
  showNotification("Edit mode enabled. You can now directly edit the document text.");
}

/**
 * Handle party type changes (consultant/client)
 */
function handlePartyTypeChange(selectElement) {
  const isConsultant = selectElement.id === "consultantType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isConsultant ? "consultant" : "client";
  const allPartyTypes = ["Individual", "Company"];

  // Remove form data for other party types
  Object.keys(formDataStore).forEach((key) => {
    if (key.startsWith(prefix) && key !== selectElement.id) {
      const keyWithoutPrefix = key.substring(prefix.length);
      const matchesOtherType = allPartyTypes
        .filter((type) => type !== selectedType)
        .some((type) => keyWithoutPrefix.toLowerCase().includes(type.toLowerCase()));

      if (matchesOtherType) {
        delete formDataStore[key];
      }
    }
  });

  // Save the selected type
  formDataStore[selectElement.id] = selectedType;

  // Handle UI field visibility
  document.querySelectorAll(`[data-show-if="${selectElement.id}"]`).forEach((field) => {
    const showValue = field.getAttribute("data-show-value");
    field.style.display = showValue === selectedType ? "block" : "none";
  });

  // Update document with the current form data
  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);
}

/**
 * Generic field change handler
 */
function handleFieldChange(element) {
  // Save the value
  formDataStore[element.id] = element.value;

  // Handle conditional fields
  const condition = element.id;
  const value = element.value;

  document.querySelectorAll(`[data-show-if="${condition}"]`).forEach((field) => {
    field.style.display = field.dataset.showValue === value ? "block" : "none";
  });

  // Update document based on new field value
  updateDocumentWithFormData(formDataStore);
  updatePreview();

  // Highlight the section affected by this field
  highlightDocumentSection(element.id);
}

/**
 * General form data restoration
 */
function restoreFormData() {
  // Restore all saved values from formDataStore
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // For select elements, also ensure conditional fields are shown/hidden correctly
      if (input.tagName === "SELECT") {
        handleFieldChange(input);
      }
    }
  });
}

/**
 * Close questionnaire modal (if needed for compatibility)
 */
function closeQuestionnaireModal() {
  // For compatibility with existing code
  console.log("Close questionnaire modal called");
}

/**
 * Get ordered paths for any key editor functionality
 */
function getOrderedPaths(obj) {
  let paths = [];
  const documentTitle = Object.keys(window.currentDocument)[0] || "Consultancy Agreement";

  if (documentTitle) {
    const mainContent = obj[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSectionForPaths(mainContent[section], `${documentTitle}.${section}`);
      }
    });
  }

  function processSectionForPaths(section, currentPath) {
    if (!section || typeof section !== "object") return;

    let keys = Object.keys(section);
    if (currentPath.endsWith("AGREEMENT")) {
      const actualKeys = Object.keys(section);
      keys = agreementSectionOrder
        .filter((k) => actualKeys.includes(k))
        .concat(actualKeys.filter((k) => !agreementSectionOrder.includes(k)));
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

/**
 * Add key-value pair dialog functions for compatibility
 */
function openAddKeyValueDialog() {
  console.log("Add key-value dialog functionality");
  // Placeholder for key-value addition functionality
}

function closeAddKeyValueDialog() {
  console.log("Close add key-value dialog");
}

function addKeyValuePair() {
  console.log("Add key-value pair functionality");
}

function openAddSubKeyValueDialog() {
  console.log("Add sub key-value dialog functionality");
}

function closeAddSubKeyValueDialog() {
  console.log("Close add sub key-value dialog");
}

function addSubKeyValuePair() {
  console.log("Add sub key-value pair functionality");
}

/**
 * Insert content dialog functions for compatibility
 */
function openInsertDialog() {
  console.log("Open insert dialog functionality");
}

function closeInsertDialog() {
  console.log("Close insert dialog functionality");
}

function insertNewContent() {
  console.log("Insert new content functionality");
}

/**
 * Update key editor functionality (if needed)
 */
function updateKeyEditor() {
  console.log("Update key editor functionality");
  // This would be implemented if a key editor interface is needed
}

/**
 * Clean up content for DOCX export
 */
function cleanupForDocx(element) {
  // Remove any highlighting classes
  const highlighted = element.querySelectorAll('.highlighted, .highlighted-section');
  highlighted.forEach(el => {
    el.classList.remove('highlighted');
    el.classList.remove('highlighted-section');
  });

  // Fix heading format
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.textContent = heading.textContent.replace(/^#+\s*/, '');
  });

  // Remove labels like "content:", "option1:", etc.
  const spans = element.querySelectorAll('span[data-value-path]');
  spans.forEach(span => {
    const text = span.textContent;
    const labelMatch = text.match(/^([a-zA-Z0-9]+):\s*(.*)/);
    if (labelMatch && labelMatch[1] &&
        (labelMatch[1].toLowerCase() === 'content' ||
         labelMatch[1].toLowerCase().includes('option'))) {
      span.textContent = labelMatch[2];
    }
  });

  // Set consistent margins and indentation
  const sections = element.querySelectorAll('.document-line');
  sections.forEach(section => {
    section.style.marginLeft = '0';
  });
}

/**
 * Navigation functions for compatibility
 */
function navigateStep(stepNumber) {
  console.log(`Navigate to step ${stepNumber}`);
}

function getCurrentStep() {
  return 1;
}

function saveStepData(stepNumber) {
  console.log(`Save step ${stepNumber} data`);
}

// Expose functions to global scope
window.showQuestionnaire = showQuestionnaire;
window.submitQuestionnaire = submitQuestionnaire;
window.handleConditionalField = handleConditionalField;
window.handleSelectChange = handleSelectChange;
window.handlePartyTypeChange = handlePartyTypeChange;
window.handleFieldChange = handleFieldChange;
window.restoreFormData = restoreFormData;
window.updateValueWithAI = updateValueWithAI;
window.saveValue = saveValue;
window.editValue = editValue;
window.enableEditing = enableEditing;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.closeEditDialog = closeEditDialog;
window.closeQuestionnaireModal = closeQuestionnaireModal;
window.navigateStep = navigateStep;
window.toggleEditMode = toggleEditMode;
window.downloadWordDocx = downloadWordDocx;
window.applyFormDataToFlatDocument = applyFormDataToFlatDocument;
window.convertToHtml = convertToHtml;
window.resolveORChoices = resolveORChoices;
window.flattenObject = flattenObject;
window.unflattenObject = unflattenObject;
window.updatePreview = updatePreview;
window.initializeDocumentTemplate = initializeDocumentTemplate;
window.getDocumentTemplate = getDocumentTemplate;
window.getOrderedPaths = getOrderedPaths;
window.updateKeyEditor = updateKeyEditor;
window.openAddKeyValueDialog = openAddKeyValueDialog;
window.closeAddKeyValueDialog = closeAddKeyValueDialog;
window.addKeyValuePair = addKeyValuePair;
window.openAddSubKeyValueDialog = openAddSubKeyValueDialog;
window.closeAddSubKeyValueDialog = closeAddSubKeyValueDialog;
window.addSubKeyValuePair = addSubKeyValuePair;
window.openInsertDialog = openInsertDialog;
window.closeInsertDialog = closeInsertDialog;
window.insertNewContent = insertNewContent;
window.cleanupForDocx = cleanupForDocx;
window.setupEventListeners = setupEventListeners;
window.validateFormData = validateFormData;