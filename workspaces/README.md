# Workspaces Directory

This directory is dynamically managed by the Isopod Server. 
When a user provisions a new sandbox, a sub-directory will be created here and bind-mounted directly into the container. 

This ensures that user files persist across container restarts.

*Note: Do not manually edit or delete the sub-directories unless performing administrative cleanup.*
