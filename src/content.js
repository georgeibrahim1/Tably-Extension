(function() {

  // states
  let rows = [];
  let currentIndex = -1;
  let isAltPressed = true;
  let lastIndex = -1;

  // General Functions
  // TODO: do the same update function while zooming out using CTRL+-
  function updateOverlayPositions() {
    const vv = window.visualViewport;
    
    overlay.style.left = vv.offsetLeft + "px";
    overlay.style.top = vv.offsetTop + "px";
    overlay.style.width = vv.width * vv.scale + "px";
    overlay.style.height = vv.height * vv.scale + "px";
    overlay.style.transform = `scale(${1 / vv.scale})`;
    overlay.style.transformOrigin = "top left";
  }

  const getTabs = () => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({action: "getTabs"}, (res) => {
        resolve(res);
      })
    })
  }

  function HoverRow(rowElement) {
    rowElement.style.backgroundColor = "rgba(59, 169, 255, 0.15)";
    rowElement.style.color = "#ffffff";
    rowElement.style.transform = "translateX(4px)";
  }

  function LeaveRow(rowElement) {
    rowElement.style.backgroundColor = "transparent";
    rowElement.style.color = "#e0e0e0";
    rowElement.style.transform = "translateX(0)";
  }

  function moveRing(index) {
    if (index < 0 || index >= rows.length) return;
    currentIndex = index;
    ring.style.display = "block";
    ring.style.top = rows[index].row.offsetTop + "px";

    for(let i = 0 ; i < rows.length ; ++i) {
      LeaveRow(rows[i].row);
    }

    HoverRow(rows[index].row);
  
    rows[index].row.scrollIntoView({
      behavior: "smooth",
      block: "nearest"  // to prevent full scrolling when the row is out of sight
    });

    lastIndex = index;

  }

  function cleanup() {
    chrome.runtime.sendMessage({ action: "activateTab", id: rows[currentIndex].tab.id });
    overlay.removeEventListener('click' , handleClickOut,true);
    window.removeEventListener('blur' , handleClean);
    document.removeEventListener('keydown', handleMove,true);
    document.removeEventListener('keyup', handleKeyUp);
    chrome.runtime.onMessage.removeListener(handleMessage);
    window.visualViewport.removeEventListener("resize", updateOverlayPositions);
    window.visualViewport.removeEventListener("scroll", updateOverlayPositions);

    if (overlay && overlay.parentNode) {
      overlay.style.opacity = "0";
      setTimeout(() => {
          if (overlay.parentNode) {
            overlay.remove();
          }
        }, 200);
    }
  }


  
  // styling

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.zIndex = "999999";
  overlay.style.background = "rgba(0, 0, 0, 0.65)";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.backdropFilter = "blur(1px)";
  overlay.style.direction = "ltr";


  
  const box = document.createElement("div");
  box.style.backgroundColor = "#1e1e2f"; 
  box.style.color = "#f5f5f5";          
  box.style.padding = "20px";
  box.style.borderRadius = "14px";
  box.style.boxShadow = "0 12px 40px rgba(0,0,0,0.5)";
  box.style.width = "400px";
  box.style.maxHeight = "480px";
  box.style.minHeight = "480px";
  box.style.overflowY = "auto";
  box.style.fontFamily = "Segoe UI, system-ui, sans-serif";
  box.style.border = "1px solid rgba(255,255,255,0.08)";
  box.style.margin = "1px 1px"
  box.style.direction = "ltr";
  overlay.appendChild(box);
  
  const ring = document.createElement("div");
  ring.style.position = "absolute";
  ring.style.height = "20px";
  ring.style.minHeight = "20px";
  ring.style.maxHeight = "20px";
  ring.style.margin = "12.5px 0px";
  ring.style.background = "rgba(0, 120, 215, 0.2)";
  ring.style.border = "2px solid #3ba9ff";
  ring.style.borderRadius = "8px";
  ring.style.transition = "top 0.15s";
  ring.style.display = "none";
  ring.style.direction = "ltr";
  box.style.position = "relative"; 
  box.appendChild(ring);
  
  // Making a SubHost inside a host (the current working tab)
  // it's isolated using Shadow Dom, which forces a dom subtree to not inherit the main host styles
  const subHost = document.createElement('div');
  subHost.style.cssText = "all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 999999;";
  const shadow = subHost.attachShadow({ mode: "closed" });
  document.body.prepend(subHost);
  updateOverlayPositions();
  shadow.appendChild(overlay);
  
  // script
  getTabs().then(tabs => {
    if (!tabs || !tabs.length) {
      box.innerText = "No tabs found.";
      return; 
    }

    console.log(tabs);

    tabs.sort((a,b) => {
      return b.lastAccessed - a.lastAccessed;
    })

    tabs.forEach((tab,i) => {
      const row = document.createElement("div");
      row.style.all = "unset";

      const icon = document.createElement("img");
      const defaultPng = chrome.runtime.getURL("public/world-globe-white-icon.png");
      icon.src = tab.favIconUrl || defaultPng;  
      icon.style.width = "18px";
      icon.style.height = "18px";
      icon.style.marginRight = "10px";
      icon.style.flexShrink = "0";

      const title = document.createElement("span");
      title.textContent = tab.title || "(no title)";
      title.style.overflow = "hidden";
      title.style.textOverflow = "ellipsis";
      title.style.whiteSpace = "nowrap";
      title.style.flexGrow = "1";

      row.style.height = "45px";
      row.style.minHeight = "45px";
      row.style.maxHeight = "45px";
      row.style.lineHeight = "45px";
      row.style.padding = "0 14px";
      row.style.margin = "0";
      row.style.borderBottom = "1px solid rgba(255,255,255,0.08)";
      row.style.fontSize = "15px";
      row.style.cursor = "pointer";
      row.style.overflow = "hidden";
      row.style.color = "#e0e0e0";
      row.style.transition = "background 0.25s, color 0.25s, transform 0.1s";
      row.style.boxSizing = "border-box";
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.verticalAlign = "middle";
      row.style.direction = "ltr";

      row.appendChild(icon);
      row.appendChild(title);


      row.addEventListener("mouseenter", () => {
        row.style.backgroundColor = "rgba(59, 169, 255, 0.15)";
        row.style.color = "#ffffff";
        row.style.transform = "translateX(4px)";
      });
      row.addEventListener("mouseleave", () => {
        row.style.backgroundColor = "transparent";
        row.style.color = "#e0e0e0";
        row.style.transform = "translateX(0)";
      });

      row.addEventListener("click", () => {
        moveRing(i);
        chrome.runtime.sendMessage({ action: "activateTab", id: tab.id });
        cleanup();
      });

      box.appendChild(row);

      rows.push({ row, tab });

    });

    if(rows.length >= 2) {
      moveRing(1);
    } else if(rows.length >= 1) {
      moveRing(0);
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    document.addEventListener("keydown",handleMove,true); // to prevent controlling the active web page 
    document.addEventListener('keyup', handleKeyUp);
    overlay.addEventListener('click', handleClickOut,true);
    window.addEventListener('blur',handleClean);
    window.visualViewport.addEventListener("resize", updateOverlayPositions);
    window.visualViewport.addEventListener("scroll", updateOverlayPositions);
  });


  // handleEvents

  function handleMessage(msg, sender, sendResponse) {
    if (msg === "is_open_content") {
      sendResponse({ is_open: true });
    }

    if(msg === "moveQ") {
      moveRing((currentIndex + 1) % rows.length);
    }
  }

  const handleMove =  (e) => {
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

    if(e.key === 'Delete') {
      chrome.runtime.sendMessage({ action: "deleteTab", id: rows[currentIndex].tab.id });
      rows[currentIndex].row.remove(); 
      rows.splice(currentIndex,1); 
      if(rows.length == 0) {
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




