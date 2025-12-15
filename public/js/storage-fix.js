        });
        
        // Mark system as initialized so sample data doesn't reload on refresh
        this.setItem('erp_system_initialized', true);
        console.log('Sample data loaded and system marked as initialized');
    }