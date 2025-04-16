/**
 * Helper function to remove brackets from filled content
 * @param {string} content - The content to process
 * @param {boolean} isValueFilled - Whether this value has been explicitly set by the user
 * @return {string} The processed content
 */
function removeBracketsIfFilled(content, isValueFilled) {
  if (!content) return content;

  // If this is a filled value, remove the brackets
  if (isValueFilled) {
    return content.replace(/\[|\]/g, '');
  }

  return content;
}// Section order matching the document flow
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
  "15. General",
  "16. STATEMENT OF WORK",
  "EXECUTION"
];

// Store document template
let documentTemplate;

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
  const promptText = customPrompt || `Please improve this text: "${currentValue}"`;

  // Make API request to get AI suggestion
  fetch("/update_value", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      selectedText: currentValue,
      prompt: promptText,
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

// Reorganized questionnaire to follow document structure
const documentQuestions = {
  step1: {
    title: "Introduction & Effective Date",
    effectiveDate: {
      question: "Enter the date of execution of this Agreement (YYYY-MM-DD):",
      type: "date",
    },
    introductionServices: {
      question: "Specify the type of consultancy services to be provided:",
      type: "text",
      placeholderText: "software development, marketing consultancy, etc."
    }
  },
  step2: {
    title: "Parties Information",
    consultantType: {
      question: "Select Consultant Type:",
      type: "select",
      options: ["Individual", "Company", "Other"]
    },
    individual: {
      consultantName: {
        question: "Enter Consultant's full name:",
        type: "text",
        showIf: "consultantType=Individual"
      },
      consultantAddress: {
        question: "Enter Consultant's address:",
        type: "text",
        showIf: "consultantType=Individual"
      }
    },
    company: {
      consultantCompanyName: {
        question: "Enter Consultant company name:",
        type: "text",
        showIf: "consultantType=Company"
      },
      consultantJurisdiction: {
        question: "Enter jurisdiction of incorporation:",
        type: "text",
        showIf: "consultantType=Company"
      },
      consultantRegNumber: {
        question: "Enter company registration number:",
        type: "text",
        showIf: "consultantType=Company"
      },
      consultantOfficeAddress: {
        question: "Enter registered office address:",
        type: "text",
        showIf: "consultantType=Company"
      }
    },
    other: {
      consultantOtherDetails: {
        question: "Enter Consultant details:",
        type: "textarea",
        showIf: "consultantType=Other"
      }
    },
    clientType: {
      question: "Select Client Type:",
      type: "select",
      options: ["Individual", "Company", "Other"]
    },
    individualClient: {
      clientName: {
        question: "Enter Client's full name:",
        type: "text",
        showIf: "clientType=Individual"
      },
      clientAddress: {
        question: "Enter Client's address:",
        type: "text",
        showIf: "clientType=Individual"
      }
    },
    companyClient: {
      clientCompanyName: {
        question: "Enter Client company name:",
        type: "text",
        showIf: "clientType=Company"
      },
      clientJurisdiction: {
        question: "Enter jurisdiction of incorporation:",
        type: "text",
        showIf: "clientType=Company"
      },
      clientRegNumber: {
        question: "Enter company registration number:",
        type: "text",
        showIf: "clientType=Company"
      },
      clientOfficeAddress: {
        question: "Enter registered office address:",
        type: "text",
        showIf: "clientType=Company"
      }
    },
    otherClient: {
      clientOtherDetails: {
        question: "Enter Client details:",
        type: "textarea",
        showIf: "clientType=Other"
      }
    }
  },
  step3: {
    title: "Key Terms",
    termOption: {
      question: "Select contract term option:",
      type: "select",
      options: [
        "Continue indefinitely",
        "Continue until services completed"
      ]
    },
    serviceStandardOption: {
      question: "Select service standard:",
      type: "select",
      options: [
        "With reasonable skill and care",
        "In accordance with industry standards",
        "Custom standard"
      ]
    },
    customServiceStandard: {
      question: "Specify custom service standard:",
      type: "textarea",
      showIf: "serviceStandardOption=Custom standard"
    },
    deliverablesOption: {
      question: "Select deliverables obligation level:",
      type: "select",
      options: [
        "Ensure deliverables meet requirements",
        "Use best endeavours to ensure deliverables meet requirements",
        "Use reasonable endeavours to ensure deliverables meet requirements"
      ]
    },
    vatOption: {
      question: "Select VAT status for charges:",
      type: "select",
      options: [
        "Inclusive of any applicable value added taxes",
        "Exclusive of any applicable value added taxes"
      ]
    },
    invoiceOption: {
      question: "Select when invoices will be issued:",
      type: "select",
      options: [
        "From time to time during the Term",
        "On specified invoicing dates",
        "After services delivered",
        "In advance of service delivery"
      ]
    }
  },
  step4: {
    title: "Limitation & Termination",
    liabilityOption: {
      question: "Select liability limitation scope:",
      type: "select",
      options: [
        "Neither party shall be liable",
        "The Consultant shall not be liable",
        "The Client shall not be liable"
      ]
    },
    terminationOption: {
      question: "Select termination option:",
      type: "select",
      options: [
        "Either party may terminate with notice",
        "Separate termination rights for each party"
      ]
    },
    subcontractingOption: {
      question: "Select subcontracting permission:",
      type: "select",
      options: [
        "Consultant must not subcontract without consent",
        "Consultant may subcontract with notification"
      ]
    }
  },
  step5: {
    title: "Statement of Work",
    minTerm: {
      question: "Specify the Minimum Term (if any):",
      type: "text",
    },
    servicesSpec: {
      question: "Specify the Services to be provided:",
      type: "textarea",
    },
    deliverablesSpec: {
      question: "Specify the Deliverables:",
      type: "textarea",
    },
    timetable: {
      question: "Specify the delivery timetable:",
      type: "textarea",
    },
    clientMaterials: {
      question: "Specify Client Materials (if any):",
      type: "textarea",
    },
    financialProvisions: {
      question: "Specify financial provisions (charges, payment terms):",
      type: "textarea",
    },
    lawJurisdiction: {
      question: "Specify governing law and jurisdiction:",
      type: "text",
      defaultValue: "English law and the courts of England"
    }
  },
  step6: {
    title: "Execution",
    consultantSignatory: {
      question: "Name of person signing for Consultant:",
      type: "text"
    },
    clientSignatory: {
      question: "Name of person signing for Client:",
      type: "text"
    }
  }
};

// Store form data between steps
let formDataStore = {};

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Consultancy Terms and Conditions": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    showQuestionnaire();
    // Then initialize the preview
    updatePreview();

    // Register highlighting events
    registerHighlightEvents();

    // Initialize AI editing functionality
    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    // Add CSS for better document styling
    addDocumentStyles();

    console.log("Document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Convert document object to HTML for preview
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];
  if (documentTitle) {
    html.push(
      `<div class="document-title"><strong>${documentTitle}</strong></div>`
    );
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
    const isMainSection = sectionOrder.includes(key);
    const marginLeft = level * 20;
    const sectionClass = isMainSection ? "main-section" : "sub-section";

    // Process section header
    if (isMainSection) {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
          <h5><strong>${key}</strong></h5>
        </div>`
      );
    } else {
      // Check if this is a section number like "16.1", "16.2" etc.
      const isSectionNumber = /^\d+\.\d+$/.test(key);
      // Check if this is a lettered item (a, b, c) or roman numeral (i, ii, iii)
      const isLetteredItem = /^[a-z]$/.test(key);
      const isRomanNumeral = /^i{1,3}|iv|v|vi{1,3}|ix|x$/.test(key);

      if (isSectionNumber) {
        // This is a section number - present it more prominently
        html.push(
          `<div class="document-line section-number" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
            <strong>${key}</strong>
          </div>`
        );
      } else if (isLetteredItem || isRomanNumeral) {
        // This is a lettered item - present it differently
        html.push(
          `<div class="document-line lettered-item" data-path="${currentPath}" style="margin-left: ${marginLeft + 10}px;">
            <span><strong>(${key})</strong></span>
          </div>`
        );
      } else {
        // Regular subsection
        html.push(
          `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft + 10}px;">
            <h6><strong>${key}</strong></h6>
          </div>`
        );
      }
    }

    // Process content
    if (typeof value === "object" && value !== null) {
      // Check if there's a title property (especially for section 16)
      if (value.title) {
        html.push(
          `<div class="document-line section-title" data-path="${currentPath}.title" style="margin-left: ${marginLeft + 30}px;">
            <strong>${value.title}:</strong>
          </div>`
        );
      }

      // Check if this is an object with a content property
      if (value.content !== undefined) {
        let contentText = value.content;
        const contentClass = isLetteredItem(key) ? "lettered-content" : "document-content";
        const contentIndent = isLetteredItem(key) ? marginLeft + 20 : marginLeft + 20;

        // If this content has been filled by the user, mark it accordingly for later processing
        const isUserFilled = contentText && contentText !== '[Date]' &&
                            contentText !== '[Specify Minimum Term]*' &&
                            contentText !== '[Specify Services]*' &&
                            contentText !== '[Specify Deliverables]*';

        const userFilledClass = isUserFilled ? 'user-filled' : '';

        // Check if we should display a "content:" label (similar to copyright.js)
        // But not for the preview, only for editing
        const isSectionWithLabel = /^\d+\.\d+$/.test(key);
        const contentLabel = isSectionWithLabel ? '<span class="content-label">content:</span> ' : '';

        // Special handling for content that contains line breaks or bulleted lists
        let formattedContent = contentText;

        // If content contains line breaks format it properly
        if (contentText && (contentText.includes('\n\n(a)') || contentText.includes('\n\n1.'))) {
          formattedContent = contentText.replace(/\n\n\(([a-z])\) /g, '<br><br><strong>($1)</strong> ');
          formattedContent = formattedContent.replace(/\n\n(\d+)\. /g, '<br><br><strong>$1.</strong> ');
        }

        html.push(
          `<div class="document-line ${contentClass}" data-path="${currentPath}.content" style="margin-left: ${contentIndent}px;">
            <span data-value-path="${currentPath}.content" class="${userFilledClass}">
              ${contentLabel}${formattedContent}
            </span>
          </div>`
        );

        // Process additional lettered parts (a, b, c) within this section
        const letterKeys = Object.keys(value).filter(k =>
          /^[a-z]$/.test(k) || /^i{1,3}|iv|v|vi{1,3}|ix|x$/.test(k) || k === 'additional'
        );

        if (letterKeys.length > 0) {
          letterKeys.forEach(letterKey => {
            const letterValue = value[letterKey];
            const letterPath = `${currentPath}.${letterKey}`;
            const letterIndent = marginLeft + 60;

            if (typeof letterValue === 'object' && letterValue !== null) {
              // Handle nested object with content property
              if (letterValue.content) {
                html.push(
                  `<div class="document-line lettered-content" data-path="${letterPath}" style="margin-left: ${letterIndent}px;">
                    <span data-value-path="${letterPath}.content">
                      <strong>(${letterKey})</strong> ${letterValue.content}
                    </span>
                  </div>`
                );

                // Recursively process any nested content
                const nestedKeys = Object.keys(letterValue).filter(k => k !== 'content');
                if (nestedKeys.length > 0) {
                  nestedKeys.forEach(nestedKey => {
                    if (typeof letterValue[nestedKey] === 'object') {
                      processSection(nestedKey, letterValue[nestedKey], level + 3, letterPath);
                    } else {
                      const nestedPath = `${letterPath}.${nestedKey}`;
                      html.push(
                        `<div class="document-line nested-content" data-path="${nestedPath}" style="margin-left: ${letterIndent + 20}px;">
                          <span data-value-path="${nestedPath}">
                            ${letterValue[nestedKey]}
                          </span>
                        </div>`
                      );
                    }
                  });
                }
              } else {
                // If no content property, process as regular section
                processSection(letterKey, letterValue, level + 2, currentPath);
              }
            } else {
              // Simple lettered item
              html.push(
                `<div class="document-line lettered-content" data-path="${letterPath}" style="margin-left: ${letterIndent}px;">
                  <span data-value-path="${letterPath}">
                    <strong>(${letterKey})</strong> ${letterValue}
                  </span>
                </div>`
              );
            }
          });
        }
      } else if (value.option1 || value.option2) {
        // Handle option sections differently - FIXED to show only selected option
        processOptionsSection(key, value, level, currentPath, marginLeft);
      } else {
        // Process regular nested objects
        const subKeys = Object.keys(value);

        subKeys.forEach(subKey => {
          const subValue = value[subKey];

          // Special handling for lettered items within a regular section
          if (/^[a-z]$/.test(subKey) || /^i{1,3}|iv|v|vi{1,3}|ix|x$/.test(subKey)) {
            const subPath = `${currentPath}.${subKey}`;

            if (typeof subValue === 'object' && subValue !== null) {
              // Process nested object within lettered item
              if (subValue.content) {
                html.push(
                  `<div class="document-line lettered-item" data-path="${subPath}" style="margin-left: ${marginLeft + 40}px;">
                    <span data-value-path="${subPath}.content">
                      <strong>(${subKey})</strong> ${subValue.content}
                    </span>
                  </div>`
                );

                // Recursively process nested content
                const nestedKeys = Object.keys(subValue).filter(k => k !== 'content');
                if (nestedKeys.length > 0) {
                  nestedKeys.forEach(nestedKey => {
                    processSection(nestedKey, subValue[nestedKey], level + 2, subPath);
                  });
                }
              } else {
                processSection(subKey, subValue, level + 1, currentPath);
              }
            } else {
              // Simple lettered item with string value
              html.push(
                `<div class="document-line lettered-item" data-path="${subPath}" style="margin-left: ${marginLeft + 40}px;">
                  <span data-value-path="${subPath}">
                    <strong>(${subKey})</strong> ${subValue}
                  </span>
                </div>`
              );
            }
          } else if (subKey === 'additional') {
            // Handle 'additional' items (often appears after lettered items)
            const additionalPath = `${currentPath}.additional`;
            html.push(
              `<div class="document-line additional-item" data-path="${additionalPath}" style="margin-left: ${marginLeft + 40}px;">
                <span data-value-path="${additionalPath}">
                  ${subValue}
                </span>
              </div>`
            );
          } else if (subKey === 'title') {
            return;
          } else if (typeof subValue === 'object' && subValue !== null) {
            // Regular nested object - recursively process
            processSection(subKey, subValue, level + 1, currentPath);
          } else {
            // Simple key-value pair
            const subPath = `${currentPath}.${subKey}`;
            html.push(
              `<div class="document-line document-content" data-path="${subPath}" style="margin-left: ${marginLeft + 40}px;">
                <span data-value-path="${subPath}">
                  <strong>${subKey}:</strong> ${subValue}
                </span>
              </div>`
            );
          }
        });
      }
    } else if (value !== null && value !== undefined) {
      // Simple value
      html.push(
        `<div class="document-line document-content" data-path="${currentPath}" style="margin-left: ${marginLeft + 40}px;">
          <span data-value-path="${currentPath}">
            ${value}
          </span>
        </div>`
      );
    }
  }

  // Helper function for improved options display
  function processOptionsSection(key, value, level, currentPath, marginLeft) {
    // Check if there's a title property
    if (value.title) {
      html.push(
        `<div class="document-line section-title" data-path="${currentPath}.title" style="margin-left: ${marginLeft + 20}px;">
          <strong>${value.title}:</strong>
        </div>`
      );
    }

    // Check for selected option - IMPORTANT: DISPLAY ONLY THE SELECTED OPTION
    if (value.selected) {
      html.push(
        `<div class="document-line document-content" data-path="${currentPath}.selected" style="margin-left: ${marginLeft + 20}px;">
          <span data-value-path="${currentPath}.selected" class="option-content">
            ${value.selected}
          </span>
        </div>`
      );
    } else {
      // If no selected option, show the options with OR separators inline
      const options = [];
      if (value.option1) options.push(value.option1);
      if (value.option2) options.push(value.option2);

      if (options.length > 0) {
        const formattedOptions = options.map((opt, index) => {
          const optText = typeof opt === 'object' ? opt.content || '' : opt;
          if (index === 0) return optText;
          return ` <strong>OR</strong> ${optText}`;
        }).join('');

        html.push(
          `<div class="document-line document-content" data-path="${currentPath}.option1" style="margin-left: ${marginLeft + 20}px;">
            <span data-value-path="${currentPath}.option1" class="option-content">
              ${formattedOptions}
            </span>
          </div>`
        );
      }
    }
  }

  // Helper to check for lettered items
  function isLetteredItem(key) {
    return /^[a-z]$/.test(key) || /^i{1,3}|iv|v|vi{1,3}|ix|x$/.test(key);
  }
}

// Function to add document styles for better formatting - more like copyright.js
function addDocumentStyles() {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    /* Main document styles */
    #documentPreview {
      font-family: serif;
      color: #333;
      line-height: 1.4;
      padding: 20px;
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow-y: auto;
<<<<<<< HEAD
      height: 100%; /* Use full height instead of max-height */
=======
      max-height: calc(100vh - 200px);
>>>>>>> 90796d983d96b7119967cead10cfa49e85466f33
    }
    
    /* Document title */
    .document-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 16px;
      border-bottom: none;
      text-align: left;
    }
    
    /* Main sections */
    .main-section {
      margin: 12px 0 0;
    }
    
    .main-section h5 {
      font-size: 15px;
      font-weight: bold;
      margin: 0;
      padding: 0;
      color: #000;
    }
    
    /* Subsections */
    .sub-section h6 {
      font-size: 14px;
      font-weight: bold;
      margin: 6px 0 2px;
      color: #222;
    }
    
    /* Content styling */
    .document-content {
      margin: 3px 0 6px;
      font-size: 14px;
    }
    
    /* Section numbers like 16.1, 16.2 */
    .section-number {
      font-weight: bold;
      display: block;
      margin-top: 8px;
      margin-bottom: 3px;
    }
    
    /* Section titles */
    .section-title {
      font-weight: normal;
      display: block;
      margin-top: 2px;
      margin-bottom: 3px;
    }
    
    /* Content with OR options */
    .option-content {
      display: inline;
    }
    
    /* Content labels */
    .content-label {
      font-weight: normal;
      font-style: italic;
      margin-right: 4px;
    }
    
    /* Lettered items styling */
    .lettered-item, .lettered-content {
      margin: 3px 0;
      padding-left: 6px;
    }
    
    .lettered-item strong, .lettered-content strong {
      margin-right: 4px;
      color: #333;
    }
    
    /* Highlighting */
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
    
    .highlighted-parent {
      border-left: 2px solid #ffcc00;
    }
    
    /* Options styling */
    .option-item {
      display: inline;
      margin-bottom: 0;
      padding: 0;
    }
    
    /* Improve readability of the document */
    .document-line {
      margin-bottom: 4px;
    }
    
    /* Editable document styling */
    #documentPreview.editable {
      border: 1px dashed #4a90e2;
      background-color: #fafafa;
    }
  `;
  document.head.appendChild(styleEl);
}

// Format OR content - helper function to properly format content with "OR" statements
function formatORContent(content) {
  if (!content.includes(' OR ')) return content;

  // Split by OR but keep everything inline (no line breaks) like in copyright.js
  const parts = content.split(' OR ');
  return parts.map((part, index) => {
    if (index === 0) {
      return part;
    } else {
      return ` <strong>OR</strong> ${part}`;
    }
  }).join('');
}

// Save selection for inserted content
let savedRange = null;
function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

document.addEventListener("DOMContentLoaded", function() {
  const previewElem = document.getElementById("documentPreview");
  if (previewElem) {
    previewElem.addEventListener("mouseup", saveSelection);
    previewElem.addEventListener("keyup", saveSelection);
  }
});

function showQuestionnaire() {
  // Get the right panel container
  const container = document.getElementById("keyContainer");

  // Check for existing save button
  const existingSaveButton = container.parentElement.querySelector("#saveDocBtn");

<<<<<<< HEAD
=======
  if (!existingSaveButton) {
    const panelHeading = container.parentElement.querySelector("h2");
    if (panelHeading) {
      panelHeading.innerHTML =
        'Document Information <button class="btn btn-add" id="saveDocBtn" onclick="submitQuestionnaire()">Save Document</button>';
    }
  }
>>>>>>> 90796d983d96b7119967cead10cfa49e85466f33

  // Clear existing content
  container.innerHTML = "";

  // Generate questionnaire following document structure
  let allQuestionsHTML = "";
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

  // Add generated HTML to the container
  container.innerHTML = allQuestionsHTML;

  // Add change handlers for real-time updates on all inputs
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      input.addEventListener("input", function () {
        // Store the value
        formDataStore[this.id] = this.value;

        // Handle conditional visibility
        if (this.tagName === "SELECT") {
          handleFieldChange(this);
        } else {
          // Update the contract in real time for other inputs
          updateDocumentWithFormData(formDataStore);
          updatePreview();

          // Highlight the affected section
          const fieldId = this.id;
          const dataPath = this.getAttribute("data-affects-path");
          if (dataPath) {
            highlightDocumentSection(fieldId);
          }
        }
      });
    });

  // Restore saved form data
  restoreFormData();
}

function createQuestionsHTML(stepData) {
  let html = "";

  // Process each field in the step
  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions (like individual, company, etc.)
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

function createQuestionField(key, data, sectionClass = "") {
  if (!data.question) return ""; // Skip if no question

  // Handle conditional visibility
  let visibilityAttr = "";
  if (data.showIf) {
    const [condition, value] = data.showIf.split("=");
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}" style="display: none;"`;
  }

  // Get affected paths for data attribute
  const affectedPaths = documentPathMap[key] ?
    `data-affects-path="${documentPathMap[key].join(',')}"` : "";

  // Create the appropriate field
  return `
    <div class="question-field ${sectionClass}" ${visibilityAttr}>
      <label>${data.question}</label>
      ${createInputElement(key, data, affectedPaths)}
    </div>
  `;
}

function createInputElement(key, data, affectedPaths) {
  // Create placeholder attribute string once for reuse
  const getPlaceholderAttr = () => {
    return data.placeholderText ? `placeholder="${data.placeholderText}"` : "";
  };

  // Handle different input types
  switch (data.type) {
    case "select":
      return `
        <select id="${key}" onchange="handleFieldChange(this)" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("")}
        </select>
      `;
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" ${affectedPaths} ${getPlaceholderAttr()}>${data.defaultValue || ""}</textarea>`;
    case "date":
      return `<input type="date" id="${key}" ${affectedPaths}>`;
    default:
      const defaultVal = data.defaultValue ? `value="${data.defaultValue}"` : "";
      return `<input type="text" id="${key}" ${affectedPaths} ${defaultVal} ${getPlaceholderAttr()}>`;
  }
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

  // Highlight the section affected by this field
  highlightDocumentSection(element.id);
}

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
  if (!dateStr) return "[Date]";
  // Convert from yyyy-mm-dd to dd-mm-yyyy
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}

// Map form data to document structure with enhanced option handling
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Consultancy Terms and Conditions";

  // Introduction section
  if (formData.effectiveDate) {
    updatedFlatDoc[`${documentTitle}.1. Introduction.Effective Date`] = formatDate(formData.effectiveDate);
  }

  if (formData.introductionServices) {
    const introKey = `${documentTitle}.1. Introduction.content`;
    let introContent = updatedFlatDoc[introKey] || "";
    introContent = introContent.replace("[consultancy services]", formData.introductionServices);
    updatedFlatDoc[introKey] = introContent;
  }

  // Consultant details - create formatted content based on type
  if (formData.consultantType) {
    const consultantKey = `${documentTitle}.2. Definitions.2.1.Consultant`;
    let consultantContent = "";

    if (formData.consultantType === "Individual") {
      const name = formData.consultantName || "[individual name]";
      const address = formData.consultantAddress || "[address]";

      // Remove brackets if values are filled
      const processedName = formData.consultantName ? name.replace(/\[|\]/g, '') : name;
      const processedAddress = formData.consultantAddress ? address.replace(/\[|\]/g, '') : address;

      consultantContent = `${processedName} of ${processedAddress}`;
    } else if (formData.consultantType === "Company") {
      const name = formData.consultantCompanyName || "[company name]";
      const jurisdiction = formData.consultantJurisdiction || "[jurisdiction]";
      const regNumber = formData.consultantRegNumber || "[registration number]";
      const address = formData.consultantOfficeAddress || "[address]";

      // Remove brackets if values are filled
      const processedName = formData.consultantCompanyName ? name.replace(/\[|\]/g, '') : name;
      const processedJurisdiction = formData.consultantJurisdiction ? jurisdiction.replace(/\[|\]/g, '') : jurisdiction;
      const processedRegNumber = formData.consultantRegNumber ? regNumber.replace(/\[|\]/g, '') : regNumber;
      const processedAddress = formData.consultantOfficeAddress ? address.replace(/\[|\]/g, '') : address;

      consultantContent = `${processedName}, a company incorporated in ${processedJurisdiction} (registration number ${processedRegNumber}) having its registered office at ${processedAddress}`;
    } else if (formData.consultantType === "Other") {
      consultantContent = formData.consultantOtherDetails ? formData.consultantOtherDetails.replace(/\[|\]/g, '') : "[identify party]";
    }

    updatedFlatDoc[consultantKey] = consultantContent;
  }

  // Client details - similarly format based on type
  if (formData.clientType) {
    const clientKey = `${documentTitle}.16. STATEMENT OF WORK.16.1.content`;
    let clientContent = "The Client is ";

    if (formData.clientType === "Individual") {
      const name = formData.clientName || "[individual name]";
      const address = formData.clientAddress || "[address]";

      // Remove brackets if values are filled
      const processedName = formData.clientName ? name.replace(/\[|\]/g, '') : name;
      const processedAddress = formData.clientAddress ? address.replace(/\[|\]/g, '') : address;

      clientContent += `${processedName} of ${processedAddress}`;
    } else if (formData.clientType === "Company") {
      const name = formData.clientCompanyName || "[company name]";
      const jurisdiction = formData.clientJurisdiction || "[jurisdiction]";
      const regNumber = formData.clientRegNumber || "[registration number]";
      const address = formData.clientOfficeAddress || "[address]";

      // Remove brackets if values are filled
      const processedName = formData.clientCompanyName ? name.replace(/\[|\]/g, '') : name;
      const processedJurisdiction = formData.clientJurisdiction ? jurisdiction.replace(/\[|\]/g, '') : jurisdiction;
      const processedRegNumber = formData.clientRegNumber ? regNumber.replace(/\[|\]/g, '') : regNumber;
      const processedAddress = formData.clientOfficeAddress ? address.replace(/\[|\]/g, '') : address;

      clientContent += `${processedName}, a company incorporated in ${processedJurisdiction} (registration number ${processedRegNumber}) having its registered office at ${processedAddress}`;
    } else if (formData.clientType === "Other") {
      clientContent += formData.clientOtherDetails ? formData.clientOtherDetails.replace(/\[|\]/g, '') : "[identify party]";
    }

    updatedFlatDoc[clientKey] = clientContent;
  }

  // Term option (3.2.content)
  if (formData.termOption) {
    const termKey = `${documentTitle}.3. Term.3.2.content`;
    let termContent = "The Contract shall continue in force ";

    if (formData.termOption === "Continue indefinitely") {
      termContent += "[indefinitely]";
    } else if (formData.termOption === "Continue until services completed") {
      termContent += "[until:\n\n(a) all the Services have been completed;\n\n(b) all the Deliverables have been delivered; and\n\n(c) all the Charges have been paid in cleared funds,\n\nupon which it will terminate automatically]";
    }

    termContent += ", subject to termination in accordance with Clause 11.";
    updatedFlatDoc[termKey] = termContent;
  }

  // Service standards (4.2.content)
  if (formData.serviceStandardOption) {
    const serviceKey = `${documentTitle}.4. Services.4.2.content`;
    let serviceContent = "The Consultant shall provide the Services ";

    if (formData.serviceStandardOption === "With reasonable skill and care") {
      serviceContent += "[with reasonable skill and care]";
    } else if (formData.serviceStandardOption === "In accordance with industry standards") {
      serviceContent += "[in accordance with the standards of skill and care reasonably expected from a leading service provider in the Consultant's industry]";
    } else if (formData.serviceStandardOption === "Custom standard" && formData.customServiceStandard) {
      serviceContent += `[${formData.customServiceStandard}]`;
    }

    serviceContent += ".";
    updatedFlatDoc[serviceKey] = serviceContent;
  }

  // Deliverables obligation (5.3.content)
  if (formData.deliverablesOption) {
    const deliverablesKey = `${documentTitle}.5. Deliverables.5.3.content`;
    let deliverablesContent = "The Consultant shall ";

    if (formData.deliverablesOption === "Ensure deliverables meet requirements") {
      deliverablesContent += "ensure";
    } else if (formData.deliverablesOption === "Use best endeavours to ensure deliverables meet requirements") {
      deliverablesContent += "use its best endeavours to ensure";
    } else if (formData.deliverablesOption === "Use reasonable endeavours to ensure deliverables meet requirements") {
      deliverablesContent += "use reasonable endeavours to ensure";
    }

    deliverablesContent += " that the Deliverables are delivered to the Client in accordance with the timetable set out in Section 5 of the Statement of Work or agreed by the parties in writing.";
    updatedFlatDoc[deliverablesKey] = deliverablesContent;
  }

  // VAT inclusion (7.2.content)
  if (formData.vatOption) {
    const vatKey = `${documentTitle}.7. Charges.7.2.content`;
    let vatContent = "All amounts stated in or in relation to these Terms and Conditions are, unless the context requires otherwise, stated ";

    if (formData.vatOption === "Inclusive of any applicable value added taxes") {
      vatContent += "inclusive of any applicable value added taxes";
    } else {
      vatContent += "exclusive of any applicable value added taxes, which will be added to those amounts and payable by the Client to the Consultant";
    }

    vatContent += ".";
    updatedFlatDoc[vatKey] = vatContent;
  }

  // Invoice timing (8.1.content)
  if (formData.invoiceOption) {
    const invoiceKey = `${documentTitle}.8. Payments.8.1.content`;
    let invoiceContent = "The Consultant shall issue invoices for the Charges to the Client ";

    if (formData.invoiceOption === "From time to time during the Term") {
      invoiceContent += "from time to time during the Term";
    } else if (formData.invoiceOption === "On specified invoicing dates") {
      invoiceContent += "on or after the invoicing dates set out in Section 7 of the Statement of Work";
    } else if (formData.invoiceOption === "After services delivered") {
      invoiceContent += "at any time after the relevant Services have been delivered to the Client";
    } else if (formData.invoiceOption === "In advance of service delivery") {
      invoiceContent += "in advance of the delivery of the relevant Services to the Client";
    }

    invoiceContent += ".";
    updatedFlatDoc[invoiceKey] = invoiceContent;
  }

  // Liability limitations (10.3-10.8.content)
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
      const liabilityKey = `${documentTitle}.10. Limitations and exclusions of liability.10.${i}.content`;
      let liabilityContent = "";

      if (formData.liabilityOption === "Neither party shall be liable") {
        liabilityContent = "Neither party shall be liable to the other party";
      } else if (formData.liabilityOption === "The Consultant shall not be liable") {
        liabilityContent = "The Consultant shall not be liable to the Client";
      } else if (formData.liabilityOption === "The Client shall not be liable") {
        liabilityContent = "The Client shall not be liable to the Consultant";
      }

      liabilityContent += ` ${liabilityPhrases[i-3]}`;
      updatedFlatDoc[liabilityKey] = liabilityContent;
    }

    // Store selected option rather than showing all options
    for (let i = 3; i <= 8; i++) {
      const selectedKey = `${documentTitle}.10. Limitations and exclusions of liability.10.${i}.selected`;
      updatedFlatDoc[selectedKey] = updatedFlatDoc[`${documentTitle}.10. Limitations and exclusions of liability.10.${i}.content`];
    }
  }

  // Termination options (11.1)
  if (formData.terminationOption) {
    if (formData.terminationOption === "Either party may terminate with notice") {
      // Use option2 which is the "either party" version
      updatedFlatDoc[`${documentTitle}.11. Termination.11.1.selected`] =
        "Either party may terminate the Contract by giving to the other party not less than 30 days' written notice of termination, expiring at the end of any calendar month OR after the end of the Minimum Term.";
    } else if (formData.terminationOption === "Separate termination rights for each party") {
      // Use option1 which specifies different rights for each party
      updatedFlatDoc[`${documentTitle}.11. Termination.11.1.selected`] =
        "The Consultant may terminate the Contract by giving to the Client not less than 30 days' written notice of termination, expiring at the end of any calendar month OR after the end of the Minimum Term. The Client may terminate the Contract by giving to the Consultant not less than 30 days' written notice of termination, expiring at the end of any calendar month OR after the end of the Minimum Term.";
    }
  }

  // Subcontracting options (14.1)
  if (formData.subcontractingOption) {
    if (formData.subcontractingOption === "Consultant must not subcontract without consent") {
      updatedFlatDoc[`${documentTitle}.14. Subcontracting.14.1.selected`] =
        "The Consultant must not subcontract any of its obligations under the Contract without the prior written consent of the Client, providing that the Client must not unreasonably withhold or delay the giving of such consent.";
    } else if (formData.subcontractingOption === "Consultant may subcontract with notification") {
      updatedFlatDoc[`${documentTitle}.14. Subcontracting.14.1.selected`] =
        "Subject to any express restrictions elsewhere in these Terms and Conditions, the Consultant may subcontract any of its obligations under the Contract, providing that the Consultant must give to the Client, promptly following the appointment of a subcontractor, a written notice specifying the subcontracted obligations and identifying the subcontractor in question.";
    }
  }

  // Statement of Work details
  if (formData.minTerm) {
    updatedFlatDoc[`${documentTitle}.16. STATEMENT OF WORK.16.2.content`] = formData.minTerm.replace(/\[|\]/g, '');
  }

  if (formData.servicesSpec) {
    updatedFlatDoc[`${documentTitle}.16. STATEMENT OF WORK.16.3.content`] = formData.servicesSpec.replace(/\[|\]/g, '');
  }

  if (formData.deliverablesSpec) {
    updatedFlatDoc[`${documentTitle}.16. STATEMENT OF WORK.16.4.content`] = formData.deliverablesSpec.replace(/\[|\]/g, '');
  }

  if (formData.timetable) {
    updatedFlatDoc[`${documentTitle}.16. STATEMENT OF WORK.16.5.content`] = formData.timetable.replace(/\[|\]/g, '');
  }

  if (formData.clientMaterials) {
    updatedFlatDoc[`${documentTitle}.16. STATEMENT OF WORK.16.6.content`] = formData.clientMaterials.replace(/\[|\]/g, '');
  }

  if (formData.financialProvisions) {
    updatedFlatDoc[`${documentTitle}.16. STATEMENT OF WORK.16.7.content`] = formData.financialProvisions.replace(/\[|\]/g, '');
  }

  // Law and jurisdiction
  if (formData.lawJurisdiction) {
    const parts = formData.lawJurisdiction.split(' and the courts of ');
    if (parts.length === 2) {
      const law = parts[0].replace(/\[|\]/g, '');
      const courts = parts[1].replace(/\[|\]/g, '');
      updatedFlatDoc[`${documentTitle}.15. General.15.7.content`] = `This Contract shall be governed by and construed in accordance with ${law}.`;
      updatedFlatDoc[`${documentTitle}.15. General.15.8.content`] = `The courts of ${courts} shall have exclusive jurisdiction to adjudicate any dispute arising under or in connection with the Contract.`;
    }
  }

  // Execution signature blocks
  if (formData.consultantSignatory || formData.consultantType) {
    let signatory = formData.consultantSignatory;

    // If no explicit signatory is provided, use the party name
    if (!signatory) {
      if (formData.consultantType === "Individual") {
        signatory = formData.consultantName || "[individual name]";
      } else if (formData.consultantType === "Company") {
        signatory = formData.consultantCompanyName || "[company name]";
      }
    }

    // Remove brackets for filled values
    const processedSignatory = formData.consultantSignatory ? signatory.replace(/\[|\]/g, '') : signatory;

    const signatoryBlock = formData.consultantType === "Individual"
      ? `SIGNED BY ${processedSignatory} on [...........], the Consultant`
      : `SIGNED BY ${processedSignatory} on [...........], duly authorised for and on behalf of the Consultant`;

    updatedFlatDoc[`${documentTitle}.EXECUTION.signature_blocks.consultant`] = signatoryBlock;
  }

  if (formData.clientSignatory || formData.clientType) {
    let signatory = formData.clientSignatory;

    if (!signatory) {
      if (formData.clientType === "Individual") {
        signatory = formData.clientName || "[individual name]";
      } else if (formData.clientType === "Company") {
        signatory = formData.clientCompanyName || "[company name]";
      }
    }

    // Remove brackets for filled values
    const processedSignatory = formData.clientSignatory ? signatory.replace(/\[|\]/g, '') : signatory;

    const signatoryBlock = formData.clientType === "Individual"
      ? `SIGNED BY ${processedSignatory} on [...........], the Client`
      : `SIGNED BY ${processedSignatory} on [...........], duly authorised for and on behalf of the Client`;

    updatedFlatDoc[`${documentTitle}.EXECUTION.signature_blocks.client`] = signatoryBlock;
  }

  return updatedFlatDoc;
}

// Update document with form data
function updateDocumentWithFormData(formData) {
  try {
    // Get template, flatten, update with form data, then unflatten back
    const flatTemplate = flattenObject(getDocumentTemplate());
    const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, formData);
    const updatedDoc = unflattenObject(updatedFlatDoc);

    // Set the updated document
    window.currentDocument = updatedDoc;

    // Update the preview
    updatePreview();
  } catch (error) {
    console.error("Error updating document:", error);
  }
}

// Update the document preview HTML
function updatePreview() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) {
    console.error("Preview element not found");
    return;
  }

  try {
    if (!window.currentDocument) {
      throw new Error("Current document is not defined.");
    }
    const html = convertToHtml(window.currentDocument);
    previewElem.innerHTML = html;
  } catch (error) {
    console.error("Error updating preview:", error);
    previewElem.innerHTML =
      '<div class="error">Error loading document preview</div>';
  }
}

/* --- Utility Functions --- */
function splitPath(path) {
  let parts = path.split(".");
  return mergeWithRules(parts);
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

/* --- Edit Value --- */
function editValue(path) {
  const input = document.querySelector(`input[data-key="${path}"]`);
  const editButton = document.querySelector(
    `button.edit-button[onclick="editValue('${path}')"]`
  );
  const saveButton = document.querySelector(
    `button.save-button[onclick="saveValue('${path}')"]`
  );
  const aiButton = document.querySelector(
    `button.ai-button[onclick="updateValueWithAI('${path}')"]`
  );

  input.readOnly = false;
  editButton.style.display = "none";
  if (aiButton) {
    aiButton.style.display = "none";
  }
  saveButton.disabled = false;
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
    // Split the path into parts based on the updated structure
    const pathParts = splitPath(path);
    let current = window.currentDocument;

    // Traverse the nested contract object until reaching the target key.
    for (let i = 0; i < pathParts.length - 1; i++) {
      let part = pathParts[i].replace(/\["(.*)"\]/, "$1");
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    // Update the final key with the new value.
    let lastPart = pathParts[pathParts.length - 1].replace(/\["(.*)"\]/, "$1");
    current[lastPart] = newValue;

    // Update the preview
    updatePreview();

    // Highlight the updated section
    highlightDocumentSection(path);

    // Update the input field and UI state
    const currentValueInput = document.querySelector(`input[data-key="${path}"]`);
    if (currentValueInput) {
      currentValueInput.value = newValue;
      currentValueInput.readOnly = true;
      currentValueInput.setAttribute("data-original-value", newValue);
    }

    // Clear any AI suggestion input
    const suggestionInput = document.querySelector(`input[data-ai-suggestion="${path}"]`);
    if (suggestionInput) {
      suggestionInput.value = "";
    }

    // Disable save button and restore button visibility
    const saveButton = document.querySelector(`button.save-button[onclick="saveValue('${path}')"]`);
    if (saveButton) {
      saveButton.disabled = true;
    }

    if (aiButton) aiButton.style.display = "";
    if (editButton) editButton.style.display = "";

    // Show success message
    const successDiv = document.getElementById(`success-${path}`);
    if (successDiv) {
      successDiv.textContent = "Changes saved successfully";
      successDiv.style.display = "block";
      setTimeout(() => {
        successDiv.style.display = "none";
      }, 3000);
    }

    // Hide any error message
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

function toggleEditMode() {
  const previewElem = document.getElementById("documentPreview");
  const toggle = document.getElementById("editModeToggle");

  if (!previewElem) return;

  if (toggle.checked) {
    // Enable editing mode
    previewElem.contentEditable = true;
    previewElem.classList.add("editable");
    showNotification("Edit mode enabled. You can now directly edit the document text.");
  } else {
    // Disable editing mode
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

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

// Improved document path map with better structure and execution section
const documentPathMap = {
  // Introduction
  "effectiveDate": ["Consultancy Terms and Conditions.1. Introduction.Effective Date"],
  "introductionServices": ["Consultancy Terms and Conditions.1. Introduction.content"],

  // Parties Information
  "consultantType": ["Consultancy Terms and Conditions.2. Definitions.2.1.Consultant"],
  "consultantName": ["Consultancy Terms and Conditions.2. Definitions.2.1.Consultant"],
  "consultantAddress": ["Consultancy Terms and Conditions.2. Definitions.2.1.Consultant"],
  "consultantCompanyName": ["Consultancy Terms and Conditions.2. Definitions.2.1.Consultant"],
  "consultantJurisdiction": ["Consultancy Terms and Conditions.2. Definitions.2.1.Consultant"],
  "consultantRegNumber": ["Consultancy Terms and Conditions.2. Definitions.2.1.Consultant"],
  "consultantOfficeAddress": ["Consultancy Terms and Conditions.2. Definitions.2.1.Consultant"],
  "consultantOtherDetails": ["Consultancy Terms and Conditions.2. Definitions.2.1.Consultant"],

  // Client Type
  "clientType": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content"],
  "clientName": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content"],
  "clientAddress": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content"],
  "clientCompanyName": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content"],
  "clientJurisdiction": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content"],
  "clientRegNumber": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content"],
  "clientOfficeAddress": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content"],
  "clientOtherDetails": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content"],

  // Key Terms
  "termOption": ["Consultancy Terms and Conditions.3. Term.3.2.content"],
  "serviceStandardOption": ["Consultancy Terms and Conditions.4. Services.4.2.content"],
  "customServiceStandard": ["Consultancy Terms and Conditions.4. Services.4.2.content"],
  "deliverablesOption": ["Consultancy Terms and Conditions.5. Deliverables.5.3.content"],
  "vatOption": ["Consultancy Terms and Conditions.7. Charges.7.2.content"],
  "invoiceOption": ["Consultancy Terms and Conditions.8. Payments.8.1.content"],

  // Limitation & Termination
  "liabilityOption": [
    "Consultancy Terms and Conditions.10. Limitations and exclusions of liability.10.3.content",
    "Consultancy Terms and Conditions.10. Limitations and exclusions of liability.10.4.content",
    "Consultancy Terms and Conditions.10. Limitations and exclusions of liability.10.5.content",
    "Consultancy Terms and Conditions.10. Limitations and exclusions of liability.10.6.content",
    "Consultancy Terms and Conditions.10. Limitations and exclusions of liability.10.7.content",
    "Consultancy Terms and Conditions.10. Limitations and exclusions of liability.10.8.content"
  ],
  "terminationOption": ["Consultancy Terms and Conditions.11. Termination.11.1.selected"],
  "subcontractingOption": ["Consultancy Terms and Conditions.14. Subcontracting.14.1.selected"],

  // Statement of Work
  "minTerm": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.2.content"],
  "servicesSpec": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.3.content"],
  "deliverablesSpec": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.4.content"],
  "timetable": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.5.content"],
  "clientMaterials": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.6.content"],
  "financialProvisions": ["Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.7.content"],
  "lawJurisdiction": [
    "Consultancy Terms and Conditions.15. General.15.7.content",
    "Consultancy Terms and Conditions.15. General.15.8.content"
  ],

  // Execution - Added both signature blocks to ensure highlighting works
  "consultantSignatory": [
    "Consultancy Terms and Conditions.EXECUTION.signature_blocks.consultant",
    "Consultancy Terms and Conditions.EXECUTION.content"
  ],
  "clientSignatory": [
    "Consultancy Terms and Conditions.EXECUTION.signature_blocks.client",
    "Consultancy Terms and Conditions.EXECUTION.content"
  ]
};

/**
 * Improved highlights document sections affected by a specific form field
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
  paths.forEach(path => {
    // First try exact path match
    const elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);

    if (elements.length > 0) {
      elements.forEach(elem => {
        elem.classList.add("highlighted");

        // Also highlight parent elements
        let parent = elem.closest('.document-line');
        if (parent) {
          parent.classList.add("highlighted-parent");
        }
      });
    } else {
      // Try to find parent sections if exact path not found
      const basePathParts = path.split(".");
      basePathParts.pop(); // Remove the last part
      const basePath = basePathParts.join(".");

      const parentElements = previewElem.querySelectorAll(`[data-path="${basePath}"]`);
      parentElements.forEach(elem => {
        elem.classList.add("highlighted-section");
      });
    }
  });

  // Scroll to the first highlighted element
  setTimeout(() => {
    const firstHighlighted = document.querySelector(".highlighted, .highlighted-section, .highlighted-parent");
    if (firstHighlighted) {
      firstHighlighted.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
}

/**
 * Removes all highlighting from the document preview
 */
function clearHighlights() {
  const previewElem = document.getElementById("documentPreview");
  const highlightedElements = previewElem.querySelectorAll(".highlighted, .highlighted-section, .highlighted-parent");
  highlightedElements.forEach(element => {
    element.classList.remove("highlighted");
    element.classList.remove("highlighted-section");
    element.classList.remove("highlighted-parent");
  });
}

/**
 * Register event listeners for field highlighting
 */
function registerHighlightEvents() {
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach(input => {
    // Focus event
    input.addEventListener("focus", function() {
      highlightDocumentSection(this.id);
    });

    // Input event to maintain highlighting during editing
    input.addEventListener("input", function() {
      highlightDocumentSection(this.id);
    });

    // Blur event
    input.addEventListener("blur", function() {
      setTimeout(() => {
        if (!document.activeElement ||
            (!document.activeElement.id && !document.activeElement.closest("#keyContainer"))) {
          clearHighlights();
        }
      }, 100);
    });
  });
}

// Download to Word DOCX function
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
                
                /* Main sections */
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
  link.download = "consultancy_terms.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper function to clean up content for DOCX
function cleanupForDocx(element) {
  // 1. Remove any highlighting classes
  const highlighted = element.querySelectorAll('.highlighted, .highlighted-section, .highlighted-parent');
  highlighted.forEach(el => {
    el.classList.remove('highlighted');
    el.classList.remove('highlighted-section');
    el.classList.remove('highlighted-parent');
  });

  // 2. Fix heading format
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.textContent = heading.textContent.replace(/^#+\s*/, '');
  });

  // 3. Remove labels like "content:", "option1:", etc.
  const spans = element.querySelectorAll('span[data-value-path]');
  spans.forEach(span => {
    // Remove content: label
    span.innerHTML = span.innerHTML.replace(/<span class="content-label">content:<\/span>\s*/, '');

    // Remove other labels
    const text = span.textContent;
    const labelMatch = text.match(/^([a-zA-Z0-9]+):\s*(.*)/);
    if (labelMatch && labelMatch[1] &&
        (labelMatch[1].toLowerCase() === 'content' ||
         labelMatch[1].toLowerCase().includes('option'))) {
      span.textContent = labelMatch[2];
    }
  });

  // 4. Set consistent margins and indentation
  const sections = element.querySelectorAll('.document-line');
  sections.forEach(section => {
    section.style.marginLeft = '0';
  });

  // 5. Remove brackets from user-filled content
  const userFilledContents = element.querySelectorAll('.user-filled');
  userFilledContents.forEach(el => {
    el.textContent = el.textContent.replace(/\[|\]/g, '');
  });
}

// Export functions to global scope
window.showQuestionnaire = showQuestionnaire;
window.submitQuestionnaire = submitQuestionnaire;
window.handleFieldChange = handleFieldChange;
window.updateValueWithAI = updateValueWithAI;
window.saveValue = saveValue;
window.editValue = editValue;
window.toggleEditMode = toggleEditMode;
window.openEditDialog = openEditDialog;
window.closeEditDialog = closeEditDialog;
window.submitAIEditRequest = submitAIEditRequest;
window.downloadWordDocx = downloadWordDocx;