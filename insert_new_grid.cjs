const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'TimetableSection.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const anchor = '  const renderSchoolWideGrid = () => {';

const newCode = `
  const exportNewSchoolTimetableToExcel = async () => {
    const ExcelJS = await import('exceljs');
    const { saveAs } = await import('file-saver');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TKB Pro';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('TKB Toan truong');
    const days = [2, 3, 4, 5, 6, 7];
    const periods = [1, 2, 3, 4, 5];

    const cols = [
      { width: 5 },
      { width: 5 },
    ];
    filteredClasses.forEach(() => {
      cols.push({ width: 14 });
      cols.push({ width: 14 });
    });
    sheet.columns = cols;

    const row1 = sheet.addRow(['THỨ', 'TIẾT']);
    let colIdx = 3;
    filteredClasses.forEach(c => {
      sheet.getCell(1, colIdx).value = c;
      sheet.mergeCells(1, colIdx, 1, colIdx + 1);
      colIdx += 2;
    });

    const row2 = sheet.addRow(['', '']);
    sheet.mergeCells('A1:A2');
    sheet.mergeCells('B1:B2');
    colIdx = 3;
    filteredClasses.forEach(() => {
      sheet.getCell(2, colIdx).value = 'Sáng';
      sheet.getCell(2, colIdx + 1).value = 'Chiều';
      colIdx += 2;
    });

    const headerFont = { name: 'Times New Roman', size: 11, bold: true };
    const thinBorder = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    
    [1, 2].forEach(r => {
      sheet.getRow(r).eachCell({ includeEmpty: true }, cell => {
        cell.font = headerFont;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
      });
    });

    let currentRow = 3;
    days.forEach(day => {
      const startDayRow = currentRow;
      periods.forEach((p, pIndex) => {
        const rowData = [pIndex === 0 ? day : '', p];
        const row = sheet.addRow(rowData);
        
        colIdx = 3;
        filteredClasses.forEach(c => {
          const itemSang = schedule.find(s => s.classId === c && s.day === day && s.period === p);
          const itemChieu = schedule.find(s => s.classId === c && s.day === day && s.period === p + 5);

          const fillCell = (item, colOffset) => {
            const cell = row.getCell(colIdx + colOffset);
            if (item) {
              const teacherId = String(item.teacherId || '').trim();
              const teacherName = teacherMap.get(teacherId) || teacherId;
              const subjectDisplayName = subjectMap.get(item.subjectId) || item.subjectId;
              
              const richText = [
                { font: { bold: true, name: 'Times New Roman', size: 10 }, text: subjectDisplayName + '\\n' },
                { font: { italic: true, name: 'Times New Roman', size: 10, color: { argb: 'FF0000FF' } }, text: teacherName }
              ];
              if (item.roomId) {
                richText.push({ font: { name: 'Times New Roman', size: 10 }, text: '\\n' + item.roomId });
              }
              cell.value = { richText };
            }
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = thinBorder;
          };

          fillCell(itemSang, 0);
          fillCell(itemChieu, 1);
          colIdx += 2;
        });

        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(1).font = { name: 'Times New Roman', size: 14, bold: true };
        row.getCell(1).border = thinBorder;
        
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).font = { name: 'Times New Roman', size: 11, bold: true };
        row.getCell(2).border = thinBorder;

        currentRow++;
      });
      
      sheet.mergeCells(startDayRow, 1, currentRow - 1, 1);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, \`TKB_Toan_Truong_Moi_\${new Date().getTime()}.xlsx\`);
  };

  const renderNewSchoolWideGrid = () => {
    const days = [2, 3, 4, 5, 6, 7];
    const periods = [1, 2, 3, 4, 5];

    return (
      <div className="school-matrix-container new-layout">
        <div className="school-filter-bar">
          <div className="filter-item">
            <label>Khối lớp:</label>
            <select 
              className="view-select compact"
              value={schoolFilterGrade}
              onChange={e => setSchoolFilterGrade(e.target.value)}
            >
              <option value="Tất cả">Tất cả các khối</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
          </div>
          <div className="filter-item search-item">
            <label>Tìm kiếm:</label>
            <div className="search-box">
              <Search size={16} />
              <input 
                type="text"
                placeholder="Nhập tên lớp (vd: 6A1)..."
                value={schoolSearchClass}
                onChange={e => setSchoolSearchClass(e.target.value)}
                className="view-input"
              />
            </div>
          </div>
          <div className="filter-item" style={{ marginLeft: 'auto' }}>
            <button className="glass-button primary-btn" onClick={() => exportNewSchoolTimetableToExcel()}>
              <FileSpreadsheet size={18} style={{ marginRight: '6px' }} />
              Xuất Excel
            </button>
          </div>
        </div>

        <div className="school-table-wrapper">
          <table className="school-schedule-table new-school-table">
            <thead>
              <tr className="tr-header-group">
                <th rowSpan={2} className="th-fixed th-day">THỨ</th>
                <th rowSpan={2} className="th-fixed th-period">TIẾT</th>
                {filteredClasses.map(c => (
                  <th key={c} colSpan={2} className="th-class-title">{c}</th>
                ))}
              </tr>
              <tr className="tr-sub-header">
                {filteredClasses.map(c => (
                  <React.Fragment key={\`sub-\${c}\`}>
                    <th className="th-sub-session">Sáng</th>
                    <th className="th-sub-session">Chiều</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={2 + filteredClasses.length * 2} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Không tìm thấy lớp học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                days.map((day, dayIndex) => (
                  <React.Fragment key={\`day-\${day}\`}>
                    {periods.map((p, pIndex) => {
                      return (
                        <tr key={\`day-\${day}-p-\${p}\`} className={pIndex === periods.length - 1 ? 'day-divider' : ''}>
                          {pIndex === 0 && (
                            <td rowSpan={periods.length} className="td-day-span">
                              {day}
                            </td>
                          )}
                          <td className="td-period-span">{p}</td>
                          
                          {filteredClasses.map(c => {
                            const itemSang = schedule.find(s => s.classId === c && s.day === day && s.period === p);
                            const itemChieu = schedule.find(s => s.classId === c && s.day === day && s.period === p + 5);

                            const renderCell = (item) => {
                              if (!item) return <td className="cell-new-empty"></td>;
                              const teacherId = String(item.teacherId || '').trim();
                              const teacherName = teacherMap.get(teacherId) || teacherId;
                              const subjectDisplayName = subjectMap.get(item.subjectId) || item.subjectId;
                              
                              return (
                                <td className="cell-new-content">
                                  <div className="new-subject">{subjectDisplayName}</div>
                                  <div className="new-teacher">{teacherName}</div>
                                  {item.roomId && <div className="new-room">{item.roomId}</div>}
                                </td>
                              );
                            };

                            return (
                              <React.Fragment key={\`\${c}-\${day}-\${p}\`}>
                                {renderCell(itemSang)}
                                {renderCell(itemChieu)}
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

`;

content = content.replace(anchor, newCode + anchor);
fs.writeFileSync(filePath, content);
console.log('Done inserting');
