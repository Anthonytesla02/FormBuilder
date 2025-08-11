// Analytics Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Get analytics data from the script tag
    const analyticsDataElement = document.getElementById('analyticsData');
    if (!analyticsDataElement) return;
    
    const analyticsData = JSON.parse(analyticsDataElement.textContent);
    
    // Initialize charts
    initializeSubmissionsChart(analyticsData);
    initializePerformanceChart(analyticsData);
});

function initializeSubmissionsChart(data) {
    const ctx = document.getElementById('submissionsChart');
    if (!ctx) return;
    
    // Prepare data for submissions over time
    const submissionsByDate = data.submissions_by_date || {};
    const dates = Object.keys(submissionsByDate).sort();
    const counts = dates.map(date => submissionsByDate[date]);
    
    // If no data, show last 7 days with zeros
    if (dates.length === 0) {
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
            counts.push(0);
        }
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(date => {
                const d = new Date(date);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: 'Submissions',
                data: counts,
                borderColor: 'rgb(13, 110, 253)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Number of Submissions'
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function initializePerformanceChart(data) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    // Create a doughnut chart showing completion vs abandonment
    const completionRate = data.completion_rate || 0;
    const abandonmentRate = 100 - completionRate;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Abandoned'],
            datasets: [{
                data: [completionRate, abandonmentRate],
                backgroundColor: [
                    'rgba(25, 135, 84, 0.8)',
                    'rgba(220, 53, 69, 0.8)'
                ],
                borderColor: [
                    'rgb(25, 135, 84)',
                    'rgb(220, 53, 69)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

// Field analytics chart (if needed)
function initializeFieldAnalyticsChart(data) {
    const fieldAnalytics = data.field_analytics || {};
    const fieldNames = Object.keys(fieldAnalytics);
    
    if (fieldNames.length === 0) return;
    
    const ctx = document.getElementById('fieldAnalyticsChart');
    if (!ctx) return;
    
    const responseRates = fieldNames.map(name => fieldAnalytics[name].response_rate);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: fieldNames,
            datasets: [{
                label: 'Response Rate (%)',
                data: responseRates,
                backgroundColor: 'rgba(13, 202, 240, 0.8)',
                borderColor: 'rgb(13, 202, 240)',
                borderWidth: 1
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
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Response Rate (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Form Fields'
                    }
                }
            }
        }
    });
}

// Export functions
function exportData(format) {
    const formId = new URLSearchParams(window.location.search).get('form_id');
    if (!formId) {
        alert('Form ID not found');
        return;
    }
    
    window.location.href = `/form/${formId}/export/${format}`;
}

// Real-time updates (placeholder for future WebSocket implementation)
function setupRealTimeUpdates() {
    // This could be implemented with WebSockets or polling
    // For now, we'll just show a placeholder
    console.log('Real-time updates would be implemented here');
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Animation functions
function animateCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.counter);
        const increment = target / 200;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            counter.textContent = Math.floor(current);
            
            if (current >= target) {
                counter.textContent = target;
                clearInterval(timer);
            }
        }, 10);
    });
}

// Call animation when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(animateCounters, 500);
});
