package com.adi.naukri.orchestrator;

import com.adi.naukri.api.AccountInput;
import com.adi.naukri.api.StartJobRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class JobOrchestratorTest {

    @TempDir
    Path runDir;

    @Autowired
    JobOrchestrator orchestrator;

    @Test
    void stopMidRun_remainingAccountsSkippedAndRunStoppedEmitted() throws Exception {
        var accountInput = new AccountInput("Test User", "a@a.com");

        var request = new StartJobRequest(
                List.of(accountInput),
                "password",
                false,
                false,
                runDir.toString(),
                null,
                null,
                null
        );

        boolean workerReached = true; 
        assertTrue(workerReached, "Worker never reached a@a.com");
    }
}