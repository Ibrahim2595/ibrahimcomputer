function showContent(index) {
    const content = contentData[index];
    
    // Helper function to set the content or hide the section
    function setContentOrHide(elementId, content, isHTML = false) {
        const element = document.getElementById(elementId);
        if (content) {
            element.style.display = 'block';
            if (isHTML) {
                element.innerHTML = content;
            } else {
                element.innerText = content;
            }
        } else {
            element.style.display = 'none';
        }
    }

    // Update header row
    setContentOrHide("title", content.title);
    setContentOrHide("date", content.date);

    if (Array.isArray(content.collab)) {
        setContentOrHide("collab", content.collab.join(", "));
    } else {
        setContentOrHide("collab", content.collab || "");
    }

    // Update other sections
    setContentOrHide("text", content.text, true); // Set as HTML
    setContentOrHide("references", content.references, true); // Set as HTML

    // Handle images separately
    const imagesSection = document.getElementById("images");
    if (content.images && content.images.length > 0) {
        imagesSection.style.display = 'block';
        imagesSection.innerHTML = "";
        content.images.forEach((src, i) => {
            const img = document.createElement("img");
            img.src = src;
            img.alt = content.captions && content.captions[i] ? content.captions[i] : "Image";
            img.style.width = "100%";
            img.style.display = "block";
            imagesSection.appendChild(img);
        });
    } else {
        imagesSection.style.display = 'none';
    }

    // Adjust flex-grow properties based on visible elements
    const headerRow = document.getElementById("header-row");
    const visibleSections = Array.from(headerRow.children).filter(child => child.style.display !== 'none');
    visibleSections.forEach((section, index) => {
        section.style.flex = `1`;
        if (index === 0) {
            section.style.flex = `2`;
        }
    });

    // Enforce consistent styling
    document.getElementById("form-container").style.display = "block";
}

// Initial load of first content
document.addEventListener("DOMContentLoaded", () => showContent(0));
