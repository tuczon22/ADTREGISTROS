import { initializeApp } from 'firebase/app';
import { 
    getFirestore, collection, addDoc, getDocs, query, where, 
    setDoc, writeBatch, deleteDoc, onSnapshot, doc 
} from 'firebase/firestore';
import { ARGENTINE_HOLIDAYS, NON_WORKING_DAYS } from './config.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB4roF9O0L2DCj1t9gmzmmL9Z8vQP5rETo",
    authDomain: "gestion-de-trabajos.firebaseapp.com",
    projectId: "gestion-de-trabajos",
    storageBucket: "gestion-de-trabajos.firebasestorage.app",
    messagingSenderId: "687878219965",
    appId: "1:687878219965:web:8986dd81b07f30a9086fd4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Points calculation
const POINTS = {
    instalacion: 3.3,
    smalljobs: 3.3,
    reparacion: 1
};

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MOTIVATION_PHRASES = [
    "¡Buen trabajo! ",
    "Cada día cuenta ",
    "¡Sigue así! ",
    "Eres imparable ",
    "Un paso más ",
    "Excelente día! ",
    "Marca la diferencia "
];

// Calculate monthly goal (3.3 points per working day, excluding holidays and non-working days)
function calculateMonthlyGoal(year, month) {
    const date = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    
    // Load non-working days from localStorage if available
    const storedNonWorkingDays = JSON.parse(localStorage.getItem('nonWorkingDays')) || [];
    NON_WORKING_DAYS.length = 0; // Clear array
    NON_WORKING_DAYS.push(...storedNonWorkingDays); // Add stored days
    
    for (let i = 1; i <= days; i++) {
        date.setDate(i);
        const currentDateString = date.toISOString().split('T')[0];
        
        // Skip weekends, Argentine holidays, and user-defined non-working days
        if (date.getDay() !== 0 && date.getDay() !== 6 && 
            !ARGENTINE_HOLIDAYS.includes(currentDateString) && 
            !NON_WORKING_DAYS.includes(currentDateString)) {
            workingDays++;
        }
    }
    
    return (workingDays * 3.3).toFixed(1);
}

// Get monthly data for chart
async function getMonthlyData() {
    const jobs = JSON.parse(localStorage.getItem('jobs'));
    const monthlyPoints = {};
    
    // Get last 6 months
    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyPoints[monthKey] = 0;
        months.push(monthKey);
    }
    
    // Calculate points for each month
    jobs.forEach(job => {
        const date = new Date(job.fecha);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyPoints.hasOwnProperty(monthKey)) {
            monthlyPoints[monthKey] += job.puntos;
        }
    });
    
    // Format data for chart
    return {
        labels: months.map(month => {
            const [year, monthNum] = month.split('-');
            return `${monthNum}/${year}`;
        }),
        data: months.map(month => monthlyPoints[month])
    };
}

// Chart initialization and update
async function updateChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    const monthlyData = await getMonthlyData();
    
    // Calculate monthly goals dynamically
    const monthlyGoals = monthlyData.labels.map(label => {
        const [month, year] = label.split('/');
        return parseFloat(calculateMonthlyGoal(parseInt(year), parseInt(month) - 1));
    });
    
    // Update monthly goal and current points
    const today = new Date();
    const monthlyGoal = calculateMonthlyGoal(today.getFullYear(), today.getMonth());
    
    // Get current month's points
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const jobs = JSON.parse(localStorage.getItem('jobs'));
    const currentPoints = jobs
        .filter(job => job.fecha.startsWith(currentMonth))
        .reduce((sum, job) => sum + job.puntos, 0);

    // Style monthly goal based on performance
    const monthlyGoalElement = document.getElementById('monthlyGoal');
    const currentPointsElement = document.getElementById('currentPoints');
    
    monthlyGoalElement.textContent = `${monthlyGoal} puntos`;
    currentPointsElement.textContent = `${currentPoints.toFixed(1)} puntos`;

    // Color coding for goal achievement
    if (currentPoints >= parseFloat(monthlyGoal)) {
        monthlyGoalElement.style.color = '#28a745'; // Green for goal met or exceeded
        monthlyGoalElement.style.fontWeight = 'bold';
        currentPointsElement.style.color = '#28a745';
        currentPointsElement.style.textShadow = '0 0 10px rgba(40, 167, 69, 0.5)';
    } else {
        monthlyGoalElement.style.color = '#dc3545'; // Red for not meeting goal
        monthlyGoalElement.style.fontWeight = 'bold';
        currentPointsElement.style.color = '#dc3545';
        currentPointsElement.style.textShadow = '0 0 10px rgba(220, 53, 69, 0.5)';
    }

    if (window.myChart) {
        window.myChart.destroy();
    }
    
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthlyData.labels,
            datasets: [
                {
                    label: 'Puntos por Mes',
                    data: monthlyData.data,
                    backgroundColor: [
                        '#1a2a6c', '#274690', '#3454D1', '#4169E1', '#4A69BD', '#6088D2'
                    ],
                    borderColor: '#1971c2',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: '#339af0'
                },
                {
                    label: 'Objetivo Mensual',
                    data: monthlyGoals,
                    type: 'line',
                    borderColor: '#28a745',
                    borderWidth: 3,
                    fill: false,
                    pointBackgroundColor: '#28a745',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#495057',
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: document.body.classList.contains('dark-mode') ? '#333' : '#e9ecef'
                    },
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#495057'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#495057'
                    }
                }
            }
        }
    });
    updateCalendar();
}

function updateCalendar(month = new Date().getMonth(), year = new Date().getFullYear()) {
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarTitle = document.getElementById('calendarTitle');
    calendarGrid.innerHTML = '';
    calendarTitle.textContent = `${MONTH_NAMES[month]} ${year}`;

    // Updated header for day names: week now starts on Sunday
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    dayNames.forEach(dayName => {
        const headerCell = document.createElement('div');
        headerCell.classList.add('calendar-day-name');
        headerCell.textContent = dayName;
        calendarGrid.appendChild(headerCell);
    });

    // Fix timezone handling - create date with time set to noon to avoid timezone issues
    const date = new Date(year, month, 1, 12, 0, 0);
    const firstDay = date.getDay();
    // With week starting on Sunday, the number of empty cells equals getDay() value
    const emptyDays = firstDay;
    for (let i = 0; i < emptyDays; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar-day', 'empty');
        calendarGrid.appendChild(emptyDay);
    }
    
    // Create day cells for the current month
    while (date.getMonth() === month) {
        const day = date.getDate();
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;
        
        // Create date string with proper timezone handling
        const dateString = date.toISOString().split('T')[0];
        const isHoliday = ARGENTINE_HOLIDAYS.includes(dateString);
        const isNonWorkingDay = NON_WORKING_DAYS.includes(dateString);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        // Check if the day has any jobs - ensure we use the correct date comparison
        const allJobs = JSON.parse(localStorage.getItem('jobs')) || [];
        const monthJobs = allJobs.filter(job => {
            return job.fecha.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
        });
        const dayJobs = monthJobs.filter(job => {
            const dayStr = String(day).padStart(2, '0');
            const monthStr = String(month + 1).padStart(2, '0');
            return job.fecha === `${year}-${monthStr}-${dayStr}`;
        });
        
        if (isHoliday) {
            dayElement.style.background = 'linear-gradient(45deg, #e91e63, #f48fb1)'; // Pink for holidays
            dayElement.style.color = 'white';
            dayElement.title = 'Feriado';
            dayElement.classList.add('holiday');
        } else if (isNonWorkingDay) {
            dayElement.style.background = 'linear-gradient(45deg, #9c27b0, #ce93d8)'; // Purple for non-working days
            dayElement.style.color = 'white';
            dayElement.title = 'Día no laborable';
            dayElement.classList.add('non-working');
        } else if (isWeekend) {
            dayElement.style.background = 'linear-gradient(45deg, #607d8b, #90a4ae)'; // Gray for weekends
            dayElement.style.color = 'white';
        } else if (dayJobs.length > 0) {
            dayElement.style.background = 'linear-gradient(45deg, #28a745, #20c997)'; // Green gradient for days with jobs
            dayElement.style.color = 'white';
            const motivation = document.createElement('div');
            motivation.classList.add('calendar-motivation');
            motivation.textContent = MOTIVATION_PHRASES[Math.floor(Math.random() * MOTIVATION_PHRASES.length)];
            dayElement.appendChild(motivation);
        } else {
            dayElement.style.background = 'linear-gradient(45deg, #fd7e14, #ffc107)'; // Orange gradient for days without jobs
            dayElement.style.color = '#212529';
        }

        // Highlight current day
        if (date.getDate() === new Date().getDate() && 
            date.getMonth() === new Date().getMonth() && 
            date.getFullYear() === new Date().getFullYear()) {
            dayElement.style.boxShadow = '0 0 0 3px #1a2a6c';
            dayElement.style.fontWeight = 'bold';
        }

        dayElement.addEventListener('click', () => {
            if (isHoliday) {
                alert(`Feriado en Argentina.`);
            } else if (isNonWorkingDay) {
                if (confirm(`Este día está marcado como no laborable. ¿Desea habilitarlo nuevamente?`)) {
                    const updatedNonWorkingDays = NON_WORKING_DAYS.filter(d => d !== dateString);
                    localStorage.setItem('nonWorkingDays', JSON.stringify(updatedNonWorkingDays));
                    NON_WORKING_DAYS.length = 0;
                    NON_WORKING_DAYS.push(...updatedNonWorkingDays);
                    updateCalendar(month, year);
                    updateChart(); // Update goal calculation
                }
            } else if (dayJobs.length > 0) {
                const jobList = dayJobs.map(job => `- Cuenta: ${job.cuenta}, Tipo: ${job.tipo}`).join('\n');
                alert(`Trabajos para el día ${day}:\n${jobList}`);
            } else {
                if (confirm(`No hay trabajos registrados para el día ${day}. ¿Desea marcarlo como día no laborable?`)) {
                    NON_WORKING_DAYS.push(dateString);
                    localStorage.setItem('nonWorkingDays', JSON.stringify(NON_WORKING_DAYS));
                    updateCalendar(month, year);
                    updateChart(); // Update goal calculation
                }
            }
        });

        calendarGrid.appendChild(dayElement);
        // Set the date to noon of the next day to avoid timezone issues
        date.setDate(date.getDate() + 1);
    }

    // Month navigation event listeners
    document.getElementById('prevMonth').addEventListener('click', () => {
        const newDate = new Date(year, month - 1);
        updateCalendar(newDate.getMonth(), newDate.getFullYear());
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        const newDate = new Date(year, month + 1);
        updateCalendar(newDate.getMonth(), newDate.getFullYear());
    });
}

// Initialize Firebase sync
async function initFirebaseSync() {
    try {
        const jobsRef = collection(db, 'jobs');
        
        // Initial data load
        const querySnapshot = await getDocs(jobsRef);
        const firebaseJobs = querySnapshot.docs.map(doc => doc.data());
        localStorage.setItem('jobs', JSON.stringify(firebaseJobs));
        
        // Real-time updates listener
        onSnapshot(jobsRef, (snapshot) => {
            const updatedJobs = snapshot.docs.map(doc => doc.data());
            localStorage.setItem('jobs', JSON.stringify(updatedJobs));
            loadHistorial();
            updateChart();
        });

        // Initial UI update
        loadHistorial();
        updateChart();
        updateCalendar();
    } catch (error) {
        console.error('Error initializing Firebase sync:', error);
        alert('Error al sincronizar con Firebase');
    }
}

// Navigation
const pages = ['resumen', 'registro', 'historial', 'ventas'];
pages.forEach(page => {
    document.getElementById(`${page}Btn`).addEventListener('click', () => showPage(page));
});

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.getElementById(`${pageId}Btn`).classList.add('active');
    
    if (pageId === 'resumen') updateChart();
    if (pageId === 'historial') loadHistorial();
}

// Form submission
document.getElementById('jobForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const jobData = {
        fecha: document.getElementById('fecha').value,
        cuenta: document.getElementById('cuenta').value,
        tipo: document.getElementById('tipo').value,
        puntos: POINTS[document.getElementById('tipo').value],
        campana: document.getElementById('campana').checked,
        timestamp: new Date().toISOString() // Default timestamp for new entries
    };

    const editId = document.getElementById('jobForm').dataset.editId;

    try {
        if (editId) {
            // Update existing job
            const jobsRef = collection(db, 'jobs');
            const q = query(jobsRef, where("timestamp", "==", editId));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach(async (doc) => {
                await setDoc(doc.ref, jobData);
            });
            
            // Remove edit mode
            delete document.getElementById('jobForm').dataset.editId;
            alert('Registro actualizado exitosamente');
        } else {
            // Add new job
            await addDoc(collection(db, 'jobs'), jobData);
            alert('Registro guardado exitosamente');
        }

        // Clear form fields after successful save or update
        document.getElementById('fecha').value = '';
        document.getElementById('cuenta').value = '';
        document.getElementById('tipo').value = 'instalacion'; // Reset to default value
        document.getElementById('campana').checked = false;
        
        // Focus back on the first input
        document.getElementById('fecha').focus();
    } catch (error) {
        console.error('Error saving/updating document:', error);
        alert('Error al guardar/actualizar registro');
    }
});

// Historial buttons
document.getElementById('exportBtn').addEventListener('click', exportToExcel);
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', importFromExcel);

// Filter event listeners
document.getElementById('filterFecha').addEventListener('change', loadHistorial);
document.getElementById('filterTipo').addEventListener('change', loadHistorial);
document.getElementById('filterCampana').addEventListener('change', loadHistorial);
document.getElementById('filterMes').addEventListener('change', loadHistorial);
document.getElementById('filterCuenta').addEventListener('input', loadHistorial);

// Load historial
async function loadHistorial() {
    const tbody = document.getElementById('historialTable');
    tbody.innerHTML = '';

    let jobs = JSON.parse(localStorage.getItem('jobs'));

    // Apply filters
    const filterFecha = document.getElementById('filterFecha').value;
    const filterCuenta = document.getElementById('filterCuenta').value;
    const filterTipo = document.getElementById('filterTipo').value;
    const filterCampana = document.getElementById('filterCampana').value;
    const filterMes = document.getElementById('filterMes').value;

    jobs = jobs.filter(job => {
        if (filterFecha && job.fecha !== filterFecha) {
            return false;
        }
        if (filterCuenta && !job.cuenta.toLowerCase().includes(filterCuenta.toLowerCase())) {
            return false;
        }
        if (filterTipo && job.tipo !== filterTipo) {
            return false;
        }
        if (filterCampana !== '' && filterCampana !== String(job.campana)) {
            return false;
        }
        if (filterMes) {
            const jobMonth = new Date(job.fecha).getMonth() + 1;
            if (String(jobMonth) !== filterMes) {
                return false;
            }
        }
        return true;
    });

    jobs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    jobs.forEach(job => {
        const row = document.createElement('tr');
        if (job.campana) row.classList.add('campana');
        
        // Fix the date display by adding the timezone offset
        const jobDate = new Date(job.fecha);
        // Add the timezone offset to display the correct date
        jobDate.setMinutes(jobDate.getMinutes() + jobDate.getTimezoneOffset());

        row.innerHTML = `
            <td>${jobDate.toLocaleDateString()}</td>
            <td>${job.cuenta}</td>
            <td>${job.tipo}</td>
            <td>${job.puntos}</td>
            <td>${job.campana ? 'Sí' : 'No'}</td>
            <td><button class="edit-btn" data-id="${job.timestamp}">Editar</button></td>
            <td><button class="delete-btn" data-id="${job.timestamp}">Borrar</button></td>
        `;

        tbody.appendChild(row);
    });

    // Add event listeners to the new buttons after they are added to the DOM
    tbody.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
            const jobId = this.dataset.id;
            const jobs = JSON.parse(localStorage.getItem('jobs'));
            const jobToEdit = jobs.find(job => job.timestamp === jobId);
            if (jobToEdit) {
                document.getElementById('fecha').value = jobToEdit.fecha;
                document.getElementById('cuenta').value = jobToEdit.cuenta;
                document.getElementById('tipo').value = jobToEdit.tipo;
                document.getElementById('campana').checked = jobToEdit.campana;
                document.getElementById('jobForm').dataset.editId = jobId;
                showPage('registro');
            } else {
                console.error('Job not found for edit:', jobId);
            }
        });
    });

    tbody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const jobId = this.dataset.id;
            deleteJob(jobId);
        });
    });
}

async function deleteJob(jobId) {
    if (confirm('¿Estás seguro de que quieres borrar este registro?')) {
        try {
            const jobsRef = collection(db, 'jobs');
            const q = query(jobsRef, where("timestamp", "==", jobId));
            const querySnapshot = await getDocs(q);
            
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);  // Use batch delete instead of doc.ref.delete()
            });
            
            await batch.commit();
            
            alert('Registro borrado exitosamente');
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Error al borrar registro');
        }

        // Reload historial
        loadHistorial();
        updateChart(); // Update chart to reflect changes
    }
}

// Export to Excel
function exportToExcel() {
    const jobs = JSON.parse(localStorage.getItem('jobs'));
    if (!jobs || jobs.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [
        ["Fecha", "N° Cuenta", "Tipo", "Puntos", "Campaña"] // Headers
    ];

    jobs.forEach(job => {
        // Fix the date by creating a date object and adjusting for timezone
        const jobDate = new Date(job.fecha);
        // Add timezone offset to display correct date
        jobDate.setMinutes(jobDate.getMinutes() + jobDate.getTimezoneOffset());
        
        wsData.push([
            jobDate.toLocaleDateString(),
            job.cuenta,
            job.tipo,
            job.puntos,
            job.campana ? 'Sí' : 'No'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Historial de Trabajos");

    XLSX.writeFile(wb, "historial_trabajos.xlsx");
}

// Import from Excel
async function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!jsonData || jsonData.length <= 1) {
            alert('El archivo Excel está vacío o no tiene datos en el formato correcto.');
            return;
        }

        const headers = jsonData[0];
        if (headers.length < 5 || headers[0] !== "Fecha" || headers[1] !== "N° Cuenta" || headers[2] !== "Tipo" || headers[3] !== "Puntos" || headers[4] !== "Campaña") {
             alert('El archivo Excel no tiene el formato esperado. Asegúrese de que las columnas sean: Fecha, N° Cuenta, Tipo, Puntos, Campaña.');
             return;
        }

        let importedJobs = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if(row.length >= 5){
                const [fecha, cuenta, tipo, puntos, campana] = row;

                let jobDate = null;
                if (typeof fecha === 'number') { 
                    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); 
                    jobDate = new Date(excelEpoch.getTime() + (fecha * 24 * 60 * 60 * 1000));
                } else {
                    jobDate = new Date(fecha); 
                }

                if(isNaN(jobDate)){
                    alert(`Error al procesar fecha en fila ${i+1}. Formato de fecha incorrecto: ${fecha}`);
                    return; 
                }

                importedJobs.push({
                    fecha: jobDate.toISOString().split('T')[0], 
                    cuenta: String(cuenta), 
                    tipo: String(tipo).toLowerCase(), 
                    puntos: parseFloat(puntos), 
                    campana: String(campana).toLowerCase() === 'sí' || String(campana).toLowerCase() === 'true', 
                    timestamp: Date.now().toString() + '_' + Math.random().toString(36).substring(2)
                });
            }
        }

        try {
            const jobsRef = collection(db, 'jobs');
            const batch = writeBatch(db);
            
            const querySnapshot = await getDocs(jobsRef);
            querySnapshot.forEach(doc => batch.delete(doc.ref));
            
            importedJobs.forEach(job => {
                const docRef = doc(collection(db, 'jobs')); 
                batch.set(docRef, job);
            });
            
            await batch.commit();
            alert('Importación completada exitosamente');
        } catch (error) {
            console.error('Error importing data:', error);
            alert('Error al importar datos');
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading Excel file:", error);
        alert("Error al leer el archivo Excel.");
    };
    reader.readAsArrayBuffer(file);
}

// Initialize Firebase sync
initFirebaseSync();

// --- Ventas Functionality ---

// New function to load and render sales history
function loadVentasHistory() {
    const tbody = document.getElementById('ventasTable');
    tbody.innerHTML = '';
    let ventas = JSON.parse(localStorage.getItem('ventas')) || [];
    const filterMes = document.getElementById('filterVentaMes').value;
    if (filterMes) {
        ventas = ventas.filter(venta => {
            const date = new Date(venta.fecha);
            if ((date.getMonth() + 1).toString() === filterMes) {
                return true;
            }
            return false;
        });
    }
    ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    ventas.forEach(venta => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(venta.fecha).toLocaleDateString()}</td>
            <td>${venta.cuenta}</td>
            <td>${venta.comentario}</td>
            <td>${venta.importe.toFixed(2)}</td>
            <td>${venta.ganancia}%</td>
            <td>${venta.total.toFixed(2)}</td>
            <td><button class="edit-venta-btn" data-id="${venta.timestamp}">Editar</button></td>
            <td><button class="delete-venta-btn" data-id="${venta.timestamp}">Borrar</button></td>
        `;
        tbody.appendChild(row);
    });

    tbody.querySelectorAll('.edit-venta-btn').forEach(button => {
        button.addEventListener('click', function() {
            const ventaId = this.dataset.id;
            const ventas = JSON.parse(localStorage.getItem('ventas')) || [];
            const ventaToEdit = ventas.find(v => v.timestamp === ventaId);
            if (ventaToEdit) {
                document.getElementById('ventaFecha').value = ventaToEdit.fecha;
                document.getElementById('ventaCuenta').value = ventaToEdit.cuenta;
                document.getElementById('ventaComentario').value = ventaToEdit.comentario;
                document.getElementById('ventaImporte').value = ventaToEdit.importe;
                document.getElementById('ventaGanancia').value = ventaToEdit.ganancia;
                document.getElementById('ventaTotal').value = ventaToEdit.total;
                document.getElementById('ventaForm').dataset.editId = ventaId;
            } else {
                console.error('Venta no encontrada para editar:', ventaId);
            }
        });
    });

    tbody.querySelectorAll('.delete-venta-btn').forEach(button => {
        button.addEventListener('click', function() {
            const ventaId = this.dataset.id;
            deleteVenta(ventaId);
        });
    });
}

// New function to delete a sale record
async function deleteVenta(ventaId) {
    if (confirm('¿Estás seguro de que quieres borrar esta venta?')) {
        try {
            const ventasRef = collection(db, 'ventas');
            const q = query(ventasRef, where("timestamp", "==", ventaId));
            const querySnapshot = await getDocs(q);
            
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);  // Use batch delete
            });
            
            await batch.commit();
            
            alert('Venta borrada exitosamente');
        } catch (error) {
            console.error('Error al borrar la venta:', error);
            alert('Error al borrar la venta. Por favor, intente nuevamente.');
        }

        // Reload ventas history
        loadVentasHistory();
        updateVentasSummary();
    }
}

// Update ventaForm submission to handle both new and edited ventas
document.getElementById('ventaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const ventaData = {
            fecha: document.getElementById('ventaFecha').value,
            cuenta: document.getElementById('ventaCuenta').value,
            comentario: document.getElementById('ventaComentario').value,
            importe: parseFloat(document.getElementById('ventaImporte').value),
            ganancia: parseInt(document.getElementById('ventaGanancia').value),
            total: parseFloat(document.getElementById('ventaTotal').value),
            timestamp: Date.now().toString()
        };

        const editId = document.getElementById('ventaForm').dataset.editId;
        const ventasRef = collection(db, 'ventas');

        if (editId) {
            // Update existing venta
            const docRef = doc(ventasRef, editId);
            await setDoc(docRef, ventaData);
            alert('Venta actualizada exitosamente');
        } else {
            // Add new venta
            await addDoc(ventasRef, ventaData);
            alert('Venta guardada exitosamente');
        }

        // Clear form
        document.getElementById('ventaForm').reset();
        document.getElementById('ventaTotal').value = '';
        delete e.target.dataset.editId;
        
    } catch (error) {
        console.error('Error al procesar la venta:', error);
        alert('Error al procesar la venta. Por favor, intente nuevamente.');
    }
});

// Update the recalcVentaTotal function to calculate:
// Total = (importe * (ganancia / 100)) * 0.79 (discount 21%), but no discount if ganancia is 100%
function recalcVentaTotal() {
    const importe = parseFloat(document.getElementById('ventaImporte').value);
    const ganancia = parseInt(document.getElementById('ventaGanancia').value);
    if (!isNaN(importe) && !isNaN(ganancia)) {
        const montoRecibido = importe * (ganancia / 100);
        // Don't apply 21% discount if ganancia is 100%
        const total = ganancia === 100 ? montoRecibido : montoRecibido * 0.79;
        document.getElementById('ventaTotal').value = total.toFixed(2);
    } else {
        document.getElementById('ventaTotal').value = '';
    }
}

// Event listeners for recalculating total on input changes
document.getElementById('ventaImporte').addEventListener('input', recalcVentaTotal);
document.getElementById('ventaGanancia').addEventListener('change', recalcVentaTotal);

// Update ventasSummary function to safely destroy existing chart
function updateVentasSummary() {
    const ventas = JSON.parse(localStorage.getItem('ventas')) || [];
    const filterMes = document.getElementById('filterVentaMes').value;
    
    // Calculate monthly totals for the chart
    const monthlyTotals = Array(12).fill(0);
    ventas.forEach(venta => {
        const date = new Date(venta.fecha);
        monthlyTotals[date.getMonth()] += venta.total;
    });

    // Update total for selected month
    let totalVentas = 0;
    if (filterMes) {
        totalVentas = monthlyTotals[parseInt(filterMes) - 1];
    }
    document.getElementById('totalVentas').textContent = totalVentas.toFixed(2);

    // Update chart
    const ctx = document.getElementById('ventasChart').getContext('2d');
    
    // Safely destroy existing chart if it exists
    if (window.ventasChart && typeof window.ventasChart.destroy === 'function') {
        window.ventasChart.destroy();
    }

    window.ventasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: MONTH_NAMES,
            datasets: [{
                label: 'Ventas por Mes',
                data: monthlyTotals.map(total => total.toFixed(2)),
                backgroundColor: [
                    '#1a2a6c', '#274690', '#3454D1', '#4169E1', '#4A69BD', 
                    '#6088D2', '#759BE1', '#8AABF1', '#b21f1f', '#e74c3c', 
                    '#fdbb2d', '#f7b733'
                ],
                borderColor: '#1971c2',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: '#339af0'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeOutBounce'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: document.body.classList.contains('dark-mode') ? '#333' : '#e9ecef'
                    },
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#495057'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#495057'
                    }
                }
            }
        }
    });
}

// Event listener for sales month filter change
document.getElementById('filterVentaMes').addEventListener('change', () => {
    updateVentasSummary();
    loadVentasHistory();
});

// Initialize ventas sync after existing Firebase sync initialization
async function initFirebaseVentas() {
    try {
        const ventasRef = collection(db, 'ventas');
        
        // Initial data load
        const querySnapshot = await getDocs(ventasRef);
        const firebaseVentas = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        localStorage.setItem('ventas', JSON.stringify(firebaseVentas));
        
        // Real-time listener
        onSnapshot(ventasRef, (snapshot) => {
            const updatedVentas = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            localStorage.setItem('ventas', JSON.stringify(updatedVentas));
            updateVentasSummary();
            loadVentasHistory();
        });

        // Initial UI update
        updateVentasSummary();
        loadVentasHistory();
    } catch (error) {
        console.error('Error initializing ventas sync:', error);
        alert('Error al sincronizar las ventas con Firebase. Por favor, intente nuevamente.');
    }
}

// Initialize ventas sync
initFirebaseVentas();

// Register Service Worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Dark Mode Toggle
const darkModeToggle = document.getElementById('darkModeToggle');
if (localStorage.getItem('dark-mode') === 'enabled') {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = "Modo Claro";
}
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        darkModeToggle.textContent = "Modo Claro";
        localStorage.setItem('dark-mode', 'enabled');
    } else {
        darkModeToggle.textContent = "Modo Oscuro";
        localStorage.setItem('dark-mode', 'disabled');
    }
});