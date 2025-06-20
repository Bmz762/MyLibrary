$(document).ready(function () {
  // Avatar image selection logic
  $(".avatar_btn").click(function () {
    const newImgSrc = $(this).find('input[type="radio"]').val();
    console.log("Changing image to:", newImgSrc);
    $(".verifiedPic").attr("src", newImgSrc);
  });

  // Confirm delete checkbox logic
  const sureCheckbox = document.getElementById('sure');
  if (sureCheckbox) {
    sureCheckbox.addEventListener('change', function () {
      if (this.checked) {
        const confirmDelete = confirm("Are you sure you want to delete your account?");
        if (!confirmDelete) {
          this.checked = false;
        }
      }
    });
  }

  // Show/hide password checkbox logic
  $(".togglePassword").on("change", function () {
    const type = this.checked ? "text" : "password";
    // If checkbox has a data-target, only change that input
    const target = $(this).data("target");
    if (target) {
      $(`#${target}`).attr("type", type);
    } else {
      // If no data-target, assume it controls all password fields
      $(".password-field").each(function () {
        $(this).attr("type", type);
      });
    }
  });
});


