let data1;
let entriesMap = new Map();
let isDataLoaded = false;

let allSources = new Set();
let selectedSources = new Set();

window.onload = function () {
    Promise.all([
        fetch('variants.json').then(response => response.json()),
        fetch('dictionary_part1.json').then(response => response.json()),
        fetch('dictionary_part2.json').then(response => response.json())
    ]).then(([variantsData, dictionaryData1, dictionaryData2]) => {
        data1 = variantsData;
        const dictionaryData = [...dictionaryData1, ...dictionaryData2];

        dictionaryData.forEach(entry => {
            if (!entriesMap.has(entry.character)) {
                entriesMap.set(entry.character, []);
            }
            entriesMap.get(entry.character).push({
                definition: entry.definition,
                source: entry.title
            });
            allSources.add(entry.title);
        });

        checkDataLoaded();
        renderSourceSelector();
    });

    const characterInput = document.getElementById("characterInput");
    characterInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            if (isDataLoaded) {
                searchCharacter();
            } else {
                alert("数据正在加载，请稍后再试。");
            }
        }
    });
};

function checkDataLoaded() {
    if (data1 && entriesMap.size > 0) {
        isDataLoaded = true;
        document.getElementById("searchButton").disabled = false;
    }
}

// 渲染来源选择复选框（表格形式）
function renderSourceSelector() {
    const table = document.getElementById("sourceSelectorContainer");
    table.innerHTML = "";

    const sourceCountMap = new Map();
    entriesMap.forEach(entryList => {
        entryList.forEach(item => {
            const title = item.source;
            sourceCountMap.set(title, (sourceCountMap.get(title) || 0) + 1);
        });
    });

    const allTitles = [...allSources].sort((a, b) => {
        const countA = sourceCountMap.get(a) || 0;
        const countB = sourceCountMap.get(b) || 0;
        if (countA !== countB) return countB - countA;

        const isHanA = /^[\u4e00-\u9fa5]/.test(a);
        const isHanB = /^[\u4e00-\u9fa5]/.test(b);
        if (isHanA && !isHanB) return -1;
        if (!isHanA && isHanB) return 1;

        return a.localeCompare(b);
    });

    const headerRow = document.createElement("tr");
    const headerCell = document.createElement("td");
    headerCell.colSpan = 2;

    const selectAll = document.createElement("input");
    selectAll.type = "checkbox";
    selectAll.checked = true;
    selectAll.id = "selectAllSources";
    selectAll.onchange = () => {
        const allCheckboxes = table.querySelectorAll("input[type='checkbox']:not(#selectAllSources)");
        selectedSources.clear();
        allCheckboxes.forEach(cb => {
            cb.checked = selectAll.checked;
            if (selectAll.checked) selectedSources.add(cb.value);
        });
    };

    const label = document.createElement("label");
    label.textContent = "全選/取消全選";
    headerCell.appendChild(selectAll);
    headerCell.appendChild(label);
    headerRow.appendChild(headerCell);
    table.appendChild(headerRow);

    allTitles.forEach(title => {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 2;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = title;
        checkbox.checked = true;
        checkbox.onchange = () => {
            if (checkbox.checked) {
                selectedSources.add(title);
            } else {
                selectedSources.delete(title);
            }
        };

        const label = document.createElement("label");
        label.textContent = title;

        cell.appendChild(checkbox);
        cell.appendChild(label);
        row.appendChild(cell);
        table.appendChild(row);

        selectedSources.add(title);
    });
}

function toggleAllCheckboxes() {
    const checkboxes = document.querySelectorAll('#filterCheckboxesContainer input[type="checkbox"]:not(#selectAll)');
    const selectAll = document.getElementById('selectAll');
    checkboxes.forEach(checkbox => checkbox.checked = selectAll.checked);
    filterResultsBySource();
}

function filterResultsBySource() {
    const selected = Array.from(document.querySelectorAll('#filterCheckboxesContainer input[type="checkbox"]:checked:not(#selectAll)'))
        .map(cb => cb.value);
    const rows = document.querySelectorAll('#resultsTable tbody tr');
    rows.forEach(row => {
        const sourceCell = row.querySelector('td:last-child');
        row.style.display = selected.includes(sourceCell.textContent.trim()) ? '' : 'none';
    });
}

function createFilterCheckboxes(sources) {
    const container = document.getElementById('filterCheckboxesContainer');
    container.innerHTML = '';

    const selectAll = document.createElement("input");
    selectAll.type = "checkbox";
    selectAll.id = "selectAll";
    selectAll.checked = true;
    selectAll.onchange = toggleAllCheckboxes;
    container.appendChild(selectAll);
    container.appendChild(Object.assign(document.createElement("label"), { textContent: "全選/取消全選" }));
    container.appendChild(document.createElement("br"));

    sources.forEach(source => {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = source;
        checkbox.checked = true;
        checkbox.onchange = filterResultsBySource;

        const label = document.createElement("label");
        label.textContent = source;

        container.appendChild(checkbox);
        container.appendChild(label);
        container.appendChild(document.createElement("br"));
    });
}

function searchCharacter() {
    const inputChar = document.getElementById("characterInput").value;
    const columnSelect = document.getElementById("columnSelect").value;
    const variantToggle = document.getElementById("variantToggle").value;
    const searchMode = document.getElementById("searchMode").value;

    const resultsBody = document.getElementById("resultsBody");
    const calledGroupsDiv = document.getElementById("calledGroups");
    const descriptionText = document.getElementById("descriptionText");

    resultsBody.innerHTML = "";
    document.getElementById("sourceSelectorContainer").style.display = "none";
    Array.from(calledGroupsDiv.children).forEach(child => {
        if (child !== descriptionText) child.remove();
    });

    const matchedVariants = new Set();
    const calledGroups = [];
    const definitionsList = [];
    const seenDefinitions = new Set();
    const uniqueSources = new Set();

    if (searchMode === "byDefinition") {
        entriesMap.forEach((definitions, key) => {
            definitions.forEach(def => {
                if (def.definition.includes(inputChar) && selectedSources.has(def.source)) {
                    const uniqueId = `${key}-${def.definition}-${def.source}`;
                    if (!seenDefinitions.has(uniqueId)) {
                        seenDefinitions.add(uniqueId);
                        uniqueSources.add(def.source);
                        definitionsList.push({
                            character: key,
                            definition: def.definition,
                            source: def.source
                        });
                    }
                }
            });
        });
        descriptionText.style.visibility = 'hidden';
        calledGroupsDiv.innerHTML += "<p>您正在查正文，未啟用異體字組。</p>";
    } else {
        if (variantToggle === "withVariants") {
            data1.forEach(group => {
                if (group.includes(inputChar)) {
                    calledGroups.push(group);
                    group.forEach(variant => matchedVariants.add(variant));
                }
            });
            if (matchedVariants.size === 0) matchedVariants.add(inputChar);
        } else {
            matchedVariants.add(inputChar);
        }

        if (variantToggle === "withoutVariants") {
            descriptionText.style.visibility = 'visible';
            calledGroupsDiv.innerHTML += `<p>您查詢的是原字：<strong>${inputChar}</strong>，未關聯異體。</p>`;
        } else {
            if (calledGroups.length > 0) {
                descriptionText.style.visibility = 'visible';
                calledGroupsDiv.innerHTML += calledGroups.map(group => `<p>[${group.join(', ')}]</p>`).join('');
            } else {
                descriptionText.style.visibility = 'hidden';
                calledGroupsDiv.innerHTML += "<p>沒有找到相關的異體字組。</p>";
            }
        }

        matchedVariants.forEach(variant => {
            entriesMap.forEach((value, key) => {
                if (key.includes(variant)) {
                    value.forEach(def => {
                        if (!selectedSources.has(def.source)) return;
                        const uniqueId = `${key}-${def.definition}-${def.source}`;
                        if (!seenDefinitions.has(uniqueId)) {
                            seenDefinitions.add(uniqueId);
                            uniqueSources.add(def.source);
                            definitionsList.push({
                                character: key,
                                definition: def.definition,
                                source: def.source
                            });
                        }
                    });
                }
            });
        });
    }

    let tableHeader = "<tr>";
    if (columnSelect === "all") {
        tableHeader += "<th>字頭</th><th>全文</th><th>书目</th>";
    } else {
        tableHeader += "<th>全文</th>";
    }
    tableHeader += "</tr>";
    document.querySelector("#resultsTable thead").innerHTML = tableHeader;

    if (definitionsList.length > 0) {
        const rows = definitionsList.map(def => {
            let row = "<tr>";
            if (columnSelect === "all") {
                row += `<td>${def.character}</td><td>${def.definition}</td><td>${def.source}</td>`;
            } else {
                row += `<td>${def.definition}</td><td style="display:none;">${def.source}</td>`;
            }
            row += "</tr>";
            return row;
        }).join('');
        resultsBody.innerHTML = rows;
        createFilterCheckboxes([...uniqueSources]);
    } else {
        resultsBody.innerHTML = "<tr><td colspan='3'>没有找到相關字。</td></tr>";
    }
}
