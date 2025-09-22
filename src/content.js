(function () {

  // states
  let rows = [];
  let currentIndex = -1;
  let isAltPressed = true;
  let lastIndex = -1;

  // General Functions
  const getTabs = () => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "getTabs" }, (res) => {
        resolve(res);
      })
    })
  }

  function ShowPreview(card, imageUrl) {
    // Check if imageUrl is valid
    if (!imageUrl || imageUrl.trim() === '') {
      // Create no preview message container
      const noPreviewContainer = document.createElement('div');
      noPreviewContainer.className = 'card-image no-preview';
      noPreviewContainer.style.width = '100%';
      noPreviewContainer.style.height = '200px';
      noPreviewContainer.style.background = 'rgba(40, 40, 40, 0.95)';
      noPreviewContainer.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      noPreviewContainer.style.borderRadius = '8px';
      noPreviewContainer.style.display = 'flex';
      noPreviewContainer.style.flexDirection = 'column';
      noPreviewContainer.style.alignItems = 'center';
      noPreviewContainer.style.justifyContent = 'center';
      noPreviewContainer.style.position = 'relative';
      noPreviewContainer.style.overflow = 'hidden';
      noPreviewContainer.style.flexShrink = '0';

      // Create icon for no preview
      const noPreviewIcon = document.createElement('div');
      noPreviewIcon.style.fontSize = '2.5rem';
      noPreviewIcon.style.marginBottom = '12px';
      noPreviewIcon.style.opacity = '0.6';
      noPreviewIcon.textContent = '🖼️';

      // Create no preview message
      const noPreviewMessage = document.createElement('div');
      noPreviewMessage.className = 'no-preview-message';
      noPreviewMessage.style.color = 'rgba(255, 255, 255, 0.7)';
      noPreviewMessage.style.fontSize = '0.9rem';
      noPreviewMessage.style.fontWeight = '500';
      noPreviewMessage.style.textAlign = 'center';
      noPreviewMessage.style.lineHeight = '1.4';
      noPreviewMessage.textContent = 'No preview for this tab';

      // Create subtitle
      const noPreviewSubtitle = document.createElement('div');
      noPreviewSubtitle.style.color = 'rgba(255, 255, 255, 0.5)';
      noPreviewSubtitle.style.fontSize = '0.75rem';
      noPreviewSubtitle.style.marginTop = '4px';
      noPreviewSubtitle.style.textAlign = 'center';
      noPreviewSubtitle.textContent = 'Preview not available';

      noPreviewContainer.appendChild(noPreviewIcon);
      noPreviewContainer.appendChild(noPreviewMessage);
      noPreviewContainer.appendChild(noPreviewSubtitle);
      card.appendChild(noPreviewContainer);

    } else {
      // Create image container (original functionality)
      const cardImage = document.createElement('div');
      cardImage.className = 'card-image';
      cardImage.style.width = '100%';
      cardImage.style.height = '200px';
      cardImage.style.backgroundImage = `url('${imageUrl}')`;
      cardImage.style.backgroundSize = 'cover';
      cardImage.style.backgroundPosition = 'center';
      cardImage.style.backgroundRepeat = 'no-repeat';
      cardImage.style.position = 'relative';
      cardImage.style.overflow = 'hidden';
      cardImage.style.flexShrink = '0';

      // Create image overlay for hover effect
      const imageOverlay = document.createElement('div');
      imageOverlay.className = 'card-image-overlay';
      imageOverlay.style.content = '';
      imageOverlay.style.position = 'absolute';
      imageOverlay.style.top = '0';
      imageOverlay.style.left = '0';
      imageOverlay.style.right = '0';
      imageOverlay.style.bottom = '0';
      imageOverlay.style.background = 'rgba(0, 0, 0, 0.3)';
      imageOverlay.style.opacity = '0';
      imageOverlay.style.transition = 'opacity 0.3s ease';
      imageOverlay.style.pointerEvents = 'none';

      cardImage.appendChild(imageOverlay);
      card.appendChild(cardImage);
    }
  }

  function FocusRow(rowElement) {
    HoverRow(rowElement);
    rowElement.style.border = '1px solid #fff';
  }

  function BlurRow(rowElement) {
    LeaveRow(rowElement);
    rowElement.style.border = 'none';
  }

  function HoverRow(rowElement) {

    rowElement.style.transform = 'translateY(-8px)';
    const imageOverlay = rowElement.querySelector('.card-image-overlay');
    if (imageOverlay) {
      imageOverlay.style.opacity = '1';
    }

  }

  function LeaveRow(rowElement) {

    rowElement.style.transform = 'translateY(0)';
    const imageOverlay = rowElement.querySelector('.card-image-overlay');
    if (imageOverlay) {
      imageOverlay.style.opacity = '0';
    }
  }

  function moveRing(index) {
    if (index < 0 || index >= rows.length) return;
    currentIndex = index;

    for (let i = 0; i < rows.length; ++i) {
      BlurRow(rows[i].card);
    }

    FocusRow(rows[index].card);

    rows[index].card.scrollIntoView({
      behavior: "smooth",
      block: "nearest"  // to prevent full scrolling when the card is out of sight
    });

    lastIndex = index;

  }

  function createCard(title, tab, index) {
    // Create card container
    const card = document.createElement('div');
    card.className = 'card';
    card.style.background = 'rgba(30, 30, 30, 0.95)';
    card.style.borderRadius = '16px';
    card.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
    card.style.backdropFilter = 'blur(8px)';
    // card.style.border = '1px solid rgba(255, 255, 255, 0.8)';
    card.style.transition = 'transform 0s ease, box-shadow 0s ease';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.overflow = 'hidden';
    card.style.maxWidth = '100%';
    card.style.cursor = 'pointer';

    card.addEventListener("click", () => {
      moveRing(index);
      chrome.runtime.sendMessage({ action: "activateTab", id: tab.id });
      cleanup();
    });

    // Add hover effects
    card.addEventListener('mouseenter', () => {
      HoverRow(card);
    });

    card.addEventListener('mouseleave', () => {
      LeaveRow(card);
    });



    // Create content container
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    cardContent.style.padding = '20px';
    cardContent.style.flexGrow = '1';


    // Create title container (flex container for icon + text)
    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-container';
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.gap = '8px';
    titleContainer.style.width = '100%';
    titleContainer.style.overflow = 'hidden';

    if (tab.favIconUrl) {

      // Create small round icon
      const titleIcon = document.createElement('div');
      titleIcon.className = 'title-icon';
      titleIcon.style.width = '20px';
      titleIcon.style.height = '20px';
      titleIcon.style.borderRadius = '5px';
      titleIcon.style.backgroundImage = `url(${tab.favIconUrl})`;
      titleIcon.style.backgroundSize = 'cover';
      titleIcon.style.backgroundPosition = 'center';
      titleIcon.style.backgroundRepeat = 'no-repeat';
      titleIcon.style.flexShrink = '0';
      // titleIcon.style.border = '1px solid rgba(255, 255, 255, 0.3)';
      titleContainer.appendChild(titleIcon);

    }


    // Create title text
    const cardTitle = document.createElement('h3');
    cardTitle.className = 'card-title';
    cardTitle.setAttribute('data-full-title', title);
    cardTitle.textContent = title;
    cardTitle.style.fontSize = '1.2rem';
    cardTitle.style.fontWeight = '600';
    cardTitle.style.color = '#ffffff';
    cardTitle.style.lineHeight = '1.3';
    cardTitle.style.whiteSpace = 'nowrap';
    cardTitle.style.overflow = 'hidden';
    cardTitle.style.textOverflow = 'ellipsis';
    cardTitle.style.textAlign = 'left';
    cardTitle.style.margin = '0';
    cardTitle.style.flex = '1';
    cardTitle.style.minWidth = '0'; // Important for ellipsis to work in flex

    titleContainer.appendChild(cardTitle);
    cardContent.appendChild(titleContainer);

    card.appendChild(cardContent);

    return card;
  }

  function cleanup() {
    chrome.runtime.sendMessage({ action: "activateTab", id: rows[currentIndex].tab.id });
    container.removeEventListener('click', handleClickOut, true);
    window.removeEventListener('blur', handleClean);
    document.removeEventListener('keydown', handleMove, true);
    document.removeEventListener('keyup', handleKeyUp);
    chrome.runtime.onMessage.removeListener(handleMessage);

    if (container && container.parentNode) {
      container.style.opacity = "0";
      setTimeout(() => {
        if (shadowHost) {
          shadowHost.remove();
        }
      }, 200);
    }
  }



  // styling
  // TODO: isolate the shit from the host page 

  // Adding shadow root in it so that it is not ruined by web page's css
  const shadowHost = document.createElement('div');
  shadowHost.style.position = "fixed";
  shadowHost.style.inset = "0 0";
  shadowHost.style.margin = "auto";
  shadowHost.style.zIndex = 9999;
  shadowHost.style.paddingBlock = '10vh';
  shadowHost.style.paddingInline = '10vw';
  shadowHost.style.width = `calc( 100vw - ${shadowHost.style.paddingInline}*2 )`;
  shadowHost.style.height = `calc( 100vh - ${shadowHost.style.paddingBlock}*2 )`;
  shadowHost.style.overflow = 'hidden';
  shadowHost.style.background = 'linear-gradient(135deg, rgba(20, 20, 20, 0.32), rgba(40, 40, 40, 0.2))';
  shadowHost.style.backdropFilter = 'blur(1px)';
  const shadow = shadowHost.attachShadow({ mode: "open" });

  const container = document.createElement('div');
  container.className = 'card-container';
  container.style.height = container.style.maxHeight = `calc(100vh - ${shadowHost.style.paddingBlock}*2)`;
  container.style.width = container.style.maxWidth = `calc(100vw - ${shadowHost.style.paddingInline}*2)`;
  container.style.display = 'flex';
  container.style.alignItems = 'flex-start';
  container.style.justifyContent = 'center';
  container.style.overflowX = 'hidden';
  container.style.overflowY = 'visible';

  shadow.appendChild(container);

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  grid.style.maxWidth = '100%';
  grid.style.width = '100%';
  grid.style.gap = '20px';
  grid.style.justifyContent = 'center';
  grid.style.margin = 'auto 0';

  container.appendChild(grid);

  document.body.append(shadowHost);

  // script
  getTabs().then(async tabs => {


    if (!tabs || !tabs.length) {
      grid.innerText = "No tabs found.";
      return;
    }

    tabs.sort((a, b) => {
      return b.lastAccessed - a.lastAccessed;
    })


    const storage = await chrome.storage.local.get("SHOW_PREVIEW");
    const SHOW_PREVIEW = !!storage.SHOW_PREVIEW;

    tabs.forEach((tab, i) => {

      const card = createCard(
        tab.title || "[No Title]",
        tab,
        i
      );

      grid.appendChild(card);
      rows.push({ card, tab });

    });


    let screenshots = new Map;

    console.log(SHOW_PREVIEW);    

    if (SHOW_PREVIEW) { //storing all ss in a map if preview is enabled

      console.log("Preview enabled");

      const response = await chrome.runtime.sendMessage({ action: "getPreview" });

      if (Array.isArray(response.screenshots)) {

        response.screenshots.forEach((screenshot) => {

          console.log(screenshot);

          const uint8Array = new Uint8Array(screenshot.byteArray);

          const blob = new Blob([uint8Array], { type: screenshot.type });
          const ssUrl = URL.createObjectURL(blob);

          screenshots.set(screenshot.tabId, ssUrl);

        })

      } else {

        console.warn("Invalid response from background script while fetching preview");

      }

      rows.forEach(row => {
        let ss = screenshots.get(row.tab.id);      
        ShowPreview(row.card, ss);
      })


    }



    if (rows.length >= 2) {
      moveRing(1);
    } else if (rows.length >= 1) {
      moveRing(0);
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    document.addEventListener("keydown", handleMove, true); // to prevent controlling the active web page 
    document.addEventListener('keyup', handleKeyUp);
    container.addEventListener('click', handleClickOut, true);
    window.addEventListener('blur', handleClean);

  });


  // handleEvents

  function handleMessage(msg, sender, sendResponse) {
    if (msg === "is_open_content") {
      sendResponse({ is_open: true });
    }

    if (msg === "moveQ") {
      moveRing((currentIndex + 1) % rows.length);
    }
  }

  const handleMove = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      moveRing((currentIndex + 1) % rows.length); // % to make it wrapped
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      moveRing((currentIndex - 1 + rows.length) % rows.length);
    }
    if (e.key === "Enter" && currentIndex >= 0) {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: "activateTab", id: rows[currentIndex].tab.id });
      cleanup();
    }

    // if(e.key === 'Esc') {
    //   e.preventDefault();
    //   e.stopPropagation();
    //   cleanup();
    // }

    if (e.key === 'Delete') {
      chrome.runtime.sendMessage({ action: "deleteTab", id: rows[currentIndex].tab.id });
      rows[currentIndex].card.remove();
      rows.splice(currentIndex, 1);
      if (rows.length == 0) {
        cleanup();
        return;
      }
      currentIndex -= 1;
      moveRing(currentIndex);
    }
  };

  function handleClickOut(e) {
    cleanup();
  }

  function handleKeyUp(e) {

    if (e.key === 'Alt' || !e.altKey) {
      isAltPressed = false;
      if (!isAltPressed) cleanup();
    }
  }

  function handleClean() {
    cleanup();
  }

})();