import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';

/// Shared white Merchant Header across all merchant screens.
/// Features Reft.AI logo or section title, dark navy text/icons, 1px bottom border,
/// and dark icons status bar styling.
class MerchantHeader extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final Widget? titleWidget;
  final List<Widget>? actions;
  final bool showLogo;
  final Widget? leading;
  final bool automaticallyImplyLeading;
  final PreferredSizeWidget? bottom;

  const MerchantHeader({
    super.key,
    this.title,
    this.titleWidget,
    this.actions,
    this.showLogo = true,
    this.leading,
    this.automaticallyImplyLeading = true,
    this.bottom,
  });

  @override
  Size get preferredSize => Size.fromHeight(
        kToolbarHeight + (bottom?.preferredSize.height ?? 0.0) + 1.0,
      );

  @override
  Widget build(BuildContext context) {
    Widget? effectiveTitle = titleWidget;
    if (effectiveTitle == null) {
      if (title != null && title!.isNotEmpty) {
        effectiveTitle = Text(
          title!,
          style: const TextStyle(
            color: AppColors.darkNeutral,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        );
      } else if (showLogo) {
        effectiveTitle = Image.asset(
          'assets/branding/reft_wordmark.png',
          width: 118,
          fit: BoxFit.contain,
          semanticLabel: 'Reft.AI',
          errorBuilder: (context, error, stackTrace) => const Text(
            'Reft.AI',
            style: TextStyle(
              color: AppColors.darkNeutral,
              fontSize: 20,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
        );
      }
    }

    PreferredSizeWidget effectiveBottom = PreferredSize(
      preferredSize: Size.fromHeight((bottom?.preferredSize.height ?? 0.0) + 1.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ?bottom,
          Container(
            color: AppColors.border,
            height: 1.0,
          ),
        ],
      ),
    );

    return AppBar(
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      automaticallyImplyLeading: automaticallyImplyLeading,
      leading: leading,
      iconTheme: const IconThemeData(color: AppColors.darkNeutral),
      actionsIconTheme: const IconThemeData(color: AppColors.darkNeutral),
      title: effectiveTitle,
      actions: actions,
      bottom: effectiveBottom,
    );
  }
}
