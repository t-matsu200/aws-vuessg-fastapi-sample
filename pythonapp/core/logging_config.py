import logging
import sys
import json
from core.middleware import trace_id_var

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }

        # Add trace_id if available
        trace_id = trace_id_var.get()
        if trace_id:
            log_record["trace_id"] = trace_id

        # Add exception info if available
        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)

        # Add stack info if available
        if record.stack_info:
            log_record["stack_info"] = self.formatStack(record.stack_info)

        return json.dumps(log_record)

def configure_logging():
    # Create logger
    logger = logging.getLogger("fastapi_app")
    logger.setLevel(logging.INFO)

    # Ensure handlers are not duplicated on reload
    if not logger.handlers:
        # Create console handler and set level to info
        ch = logging.StreamHandler(sys.stdout)
        ch.setLevel(logging.INFO)

        # Add JSON formatter to ch
        json_formatter = JsonFormatter()
        ch.setFormatter(json_formatter)

        # Add ch to logger
        logger.addHandler(ch)

    # Suppress uvicorn's default access logs to avoid duplication
    logging.getLogger("uvicorn.access").propagate = False
    logging.getLogger("uvicorn.error").propagate = False

    return logger
