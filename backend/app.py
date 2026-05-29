from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

from models.database import init_db
from routes.export_routes import export_bp
from routes.history_routes import history_bp
from routes.weather_routes import weather_bp


def create_app():
    """Create and configure the Flask application."""
    frontend_folder = Path(__file__).resolve().parent.parent / "frontend"
    app = Flask(
        __name__,
        static_folder=str(frontend_folder),
        static_url_path="",
    )
    CORS(app, resources={r"/*": {"origins": "*"}})

    # Initialize database and tables before the first request.
    init_db()

    # Register blueprint-based route modules.
    app.register_blueprint(weather_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(export_bp)

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(500)
    def handle_internal_error(error):
        return jsonify({"error": "Internal server error."}), 500

    @app.route("/")
    def index():
        return app.send_static_file("index.html")

    @app.route("/api/health")
    def health_check():
        return jsonify({"message": "Weather API is running."})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
