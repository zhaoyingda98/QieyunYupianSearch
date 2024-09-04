let data1; // 存储异体字数据
let entriesMap = new Map(); // 存储字典原始数据，使用 Map 来优化查找性能
let isDataLoaded = false; // 标识数据是否已加载完毕

// 加载 JSON 数据
window.onload = function() {
    // 并行加载异体字数据和字典数据，提升性能
    Promise.all([
        fetch('variants.json').then(response => response.json()),
        fetch('dictionary.json').then(response => response.json())
    ]).then(([variantsData, dictionaryData]) => {
        data1 = variantsData;
        dictionaryData.forEach(entry => {
            if (!entriesMap.has(entry.character)) {
                entriesMap.set(entry.character, []);
            }
            entriesMap.get(entry.character).push({
                definition: entry.definition,
                source: entry.title
            });
        });
        checkDataLoaded(); // 检查数据加载状态
    });

    // 为输入框添加回车键事件监听
    const characterInput = document.getElementById("characterInput");
    characterInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            if (isDataLoaded) {
                searchCharacter();  // 用户按下回车键时调用查询函数
            } else {
                alert("数据正在加载，请稍后再试。");
            }
        }
    });
};

// 检查数据是否已完全加载
function checkDataLoaded() {
    if (data1 && entriesMap.size > 0) {
        isDataLoaded = true; // 当两个数据都加载完毕时，允许用户进行查询
        document.getElementById("searchButton").disabled = false; // 启用按钮
    }
}

// 创建筛选复选框
function createFilterCheckboxes(sources) {
    const filterCheckboxesContainer = document.getElementById('filterCheckboxesContainer');
    filterCheckboxesContainer.innerHTML = ''; // 清空已有的复选框

    // 创建一个"全选/取消全选"的复选框
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'selectAll';
    selectAllCheckbox.checked = true; // 初始状态为全选
    selectAllCheckbox.onchange = toggleAllCheckboxes; // 绑定全选事件
    filterCheckboxesContainer.appendChild(selectAllCheckbox);
    
    const selectAllLabel = document.createElement('label');
    selectAllLabel.textContent = '全選/取消全選';
    filterCheckboxesContainer.appendChild(selectAllLabel);
    filterCheckboxesContainer.appendChild(document.createElement('br'));

    // 为每个书目创建复选框
    sources.forEach(source => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = source;
        checkbox.checked = true; // 默认情况下全选
        checkbox.onchange = filterResultsBySource; // 当复选框变化时，重新筛选

        const label = document.createElement('label');
        label.textContent = source;

        filterCheckboxesContainer.appendChild(checkbox);
        filterCheckboxesContainer.appendChild(label);
        filterCheckboxesContainer.appendChild(document.createElement('br'));
    });
}

// 全选/取消全选功能
function toggleAllCheckboxes() {
    const checkboxes = document.querySelectorAll('#filterCheckboxesContainer input[type="checkbox"]:not(#selectAll)');
    const selectAll = document.getElementById('selectAll');
    
    // 更新所有复选框状态
    checkboxes.forEach(checkbox => checkbox.checked = selectAll.checked); 
    
    // 重新根据选中的书目筛选显示结果
    filterResultsBySource(); 
}

// 根据选中的复选框筛选结果
// 根据选中的复选框筛选结果
function filterResultsBySource() {
    const selectedSources = Array.from(document.querySelectorAll('#filterCheckboxesContainer input[type="checkbox"]:checked:not(#selectAll)'))
                                 .map(checkbox => checkbox.value); // 获取选中的书目来源
    const rows = document.querySelectorAll('#resultsTable tbody tr');

    // 如果没有任何复选框被勾选，则隐藏所有行
    if (selectedSources.length === 0) {
        rows.forEach(row => {
            row.style.display = 'none'; // 隐藏所有行
        });
    } else {
        // 根据选中的书目来源显示相应的行
        rows.forEach(row => {
            const sourceCell = row.querySelector('td:last-child');
            // 如果该行的来源在选中的书目中，则显示，否则隐藏
            row.style.display = selectedSources.includes(sourceCell.textContent.trim()) ? '' : 'none';
        });
    }
}

// 在搜索完成后调用此方法生成复选框
function searchCharacter() {
    const inputChar = document.getElementById("characterInput").value;
    const resultsBody = document.getElementById("resultsBody");
    const calledGroupsDiv = document.getElementById("calledGroups");
    const descriptionText = document.getElementById("descriptionText");
    const instructionText = document.getElementById("instructionText"); // 获取说明文字的元素
    const columnSelect = document.getElementById("columnSelect").value;

    resultsBody.innerHTML = "";

    // 清空之前的查询结果，保留 descriptionText
    const calledGroupsDivChildren = Array.from(calledGroupsDiv.children);
    calledGroupsDivChildren.forEach(child => {
        if (child !== descriptionText) {
            child.remove();
        }
    });

    // 隐藏说明性文字
    instructionText.style.display = 'none';

    const matchedVariants = new Set();
    const calledGroups = [];

    // 查找匹配的异体字组
    data1.forEach(group => {
        group.forEach(char => {
            if (char.includes(inputChar)) {
                calledGroups.push(group);
                group.forEach(variant => matchedVariants.add(variant));
            }
        });
    });

    // 根据查询结果显示或隐藏“返回的異體字組：”这段文字
    if (calledGroups.length > 0) {
        descriptionText.style.visibility = 'visible'; // 有结果时显示文字
        calledGroupsDiv.innerHTML += calledGroups.map(group => `<p>[${group.join(', ')}]</p>`).join('');
    } else {
        descriptionText.style.visibility = 'hidden'; // 没有结果时隐藏文字
        calledGroupsDiv.innerHTML += "<p>没有找到相关的异体字组。</p>";
    }

    // 后续代码生成表格的逻辑保持不变

    const definitions = [];
    const seenDefinitions = new Set();
    const uniqueSources = new Set(); // 收集书目来源

    matchedVariants.forEach(variant => {
        entriesMap.forEach((value, key) => {
            if (key.includes(variant)) {
                value.forEach(definition => {
                    const uniqueIdentifier = `${key}-${definition.definition}-${definition.source}`;
                    if (!seenDefinitions.has(uniqueIdentifier)) {
                        seenDefinitions.add(uniqueIdentifier);
                        uniqueSources.add(definition.source); // 收集书目来源
                        definitions.push({
                            character: key,
                            definition: definition.definition,
                            source: definition.source
                        });
                    }
                });
            }
        });
    });

    // 根据用户的选择来生成表格表头
    let tableHeader = "<tr>";
    if (columnSelect === "all") {
        tableHeader += "<th>字頭</th><th>全文</th><th>书目</th>";
    } else if (columnSelect === "definitionOnly") {
        tableHeader += "<th>全文</th>";
    }
    tableHeader += "</tr>";
    document.querySelector("#resultsTable thead").innerHTML = tableHeader;

    if (definitions.length > 0) {
        const rows = definitions.map(definition => {
            let row = "<tr>";
            if (columnSelect === "all") {
                row += `<td>${definition.character}</td><td>${definition.definition}</td><td>${definition.source}</td>`;
            } else if (columnSelect === "definitionOnly") {
                row += `<td>${definition.definition}</td>`;
                row += `<td style="display:none;">${definition.source}</td>`; // 隐藏书目列，但保留数据
            }
            row += "</tr>";
            return row;
        }).join('');

        resultsBody.innerHTML = rows;

        // 创建筛选用的复选框
        createFilterCheckboxes([...uniqueSources]);
    } else {
        resultsBody.innerHTML = "<tr><td colspan='3'>没有找到相關字。</td></tr>";
    }
}
